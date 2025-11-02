import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Conversation, Message } from '../models/conversation.entity';
import { logger } from '../utils/logger';
import { NotFoundError } from '../middleware/error.middleware';
import { envConfig } from '../config/env.config';
import { RedisKeys, getRedisClient } from '../config/redis.config';
import { invalidateDashboardCache } from '../utils/cache/dashboard-cache';
import { WebSocketService } from '../websockets/socket.service';

interface CachedMessage {
  role: Message['role'];
  content: string;
  timestamp: string;
}

interface ConversationCachePayload {
  id: string;
  userId: string;
  sessionId: string;
  messages: CachedMessage[];
  isActive: boolean;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

const getRedisSafeClient = () => {
  try {
    return getRedisClient();
  } catch (error) {
    return null;
  }
};

const mapMessageToCache = (message: Message): CachedMessage => ({
  role: message.role,
  content: message.content,
  timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : new Date(message.timestamp).toISOString(),
});

const mapMessageFromCache = (message: CachedMessage): Message => ({
  role: message.role,
  content: message.content,
  timestamp: new Date(message.timestamp),
});

export class ConversationService {
  private conversationRepository: Repository<Conversation>;

  constructor() {
    this.conversationRepository = AppDataSource.getRepository(Conversation);
  }

  private getCacheKey(sessionId: string): string {
    return RedisKeys.conversation(sessionId);
  }

  private async setCache(conversation: Conversation): Promise<void> {
    const client = getRedisSafeClient();
    if (!client) {
      return;
    }

    const payload: ConversationCachePayload = {
      id: conversation.id,
      userId: conversation.userId,
      sessionId: conversation.sessionId,
      messages: conversation.messages.map(mapMessageToCache),
      isActive: conversation.isActive,
      metadata: conversation.metadata || null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };

    await client.set(this.getCacheKey(conversation.sessionId), JSON.stringify(payload), {
      EX: envConfig.CACHE_TTL_CONVERSATIONS,
    });
  }

  private async removeCache(sessionId: string): Promise<void> {
    const client = getRedisSafeClient();
    if (!client) {
      return;
    }
    await client.del(this.getCacheKey(sessionId));
  }

  private hydrateFromCache(payload: ConversationCachePayload): Conversation {
    return {
      id: payload.id,
      userId: payload.userId,
      sessionId: payload.sessionId,
      messages: payload.messages.map(mapMessageFromCache),
      isActive: payload.isActive,
      metadata: payload.metadata ?? null,
      createdAt: new Date(payload.createdAt),
      updatedAt: new Date(payload.updatedAt),
    } as Conversation;
  }

  private async fetchFromCache(sessionId: string): Promise<Conversation | null> {
    const client = getRedisSafeClient();
    if (!client) {
      return null;
    }

    const cached = await client.get(this.getCacheKey(sessionId));
    if (!cached) {
      return null;
    }

    try {
      const parsed = JSON.parse(cached) as ConversationCachePayload;
      return this.hydrateFromCache(parsed);
    } catch (error) {
      logger.warn('Failed to parse conversation cache payload, purging key', {
        sessionId,
        error,
      });
      await client.del(this.getCacheKey(sessionId));
      return null;
    }
  }

  async getConversation(sessionId: string): Promise<Conversation | null> {
    const cached = await this.fetchFromCache(sessionId);
    if (cached) {
      return cached;
    }

    const conversation = await this.conversationRepository.findOne({
      where: { sessionId },
    });

    if (conversation) {
      await this.setCache(conversation);
    }

    return conversation;
  }

  async getConversationForUser(userId: string, sessionId: string): Promise<Conversation | null> {
    const conversation = await this.getConversation(sessionId);
    if (conversation && conversation.userId === userId) {
      return conversation;
    }
    return null;
  }

  async getOrCreateConversation(userId: string, sessionId: string): Promise<Conversation> {
    let conversation = await this.getConversationForUser(userId, sessionId);

    if (!conversation) {
      conversation = this.conversationRepository.create({
        userId,
        sessionId,
        messages: [],
        isActive: true,
        metadata: {},
      });
      conversation = await this.conversationRepository.save(conversation);
      await this.setCache(conversation);
      logger.info('Created new conversation session', { userId, sessionId });
    }

    return conversation;
  }

  async getActiveConversationsForUser(userId: string): Promise<Conversation[]> {
    return this.conversationRepository.find({
      where: { userId, isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async appendMessage(
    userId: string,
    sessionId: string,
    message: Message,
    metadata?: Record<string, any>
  ): Promise<Conversation> {
    const conversation = await this.getOrCreateConversation(userId, sessionId);
    conversation.messages = [...conversation.messages, message];
    conversation.isActive = true;

    if (metadata) {
      conversation.metadata = {
        ...(conversation.metadata || {}),
        ...metadata,
      };
    }

    const updated = await this.conversationRepository.save(conversation);
    await this.setCache(updated);

    WebSocketService.getInstance().emitToUser(userId, 'chat:message', {
      sessionId,
      message: {
        role: message.role,
        content: message.content,
        timestamp:
          message.timestamp instanceof Date
            ? message.timestamp.toISOString()
            : new Date(message.timestamp).toISOString(),
      },
    });

    if (message.role === 'assistant') {
      await invalidateDashboardCache(userId);
    }

    return updated;
  }

  async replaceMessages(
    userId: string,
    sessionId: string,
    messages: Message[],
    metadata?: Record<string, any>
  ): Promise<Conversation> {
    const conversation = await this.getOrCreateConversation(userId, sessionId);
    conversation.messages = messages;

    if (metadata) {
      conversation.metadata = {
        ...(conversation.metadata || {}),
        ...metadata,
      };
    }

    const updated = await this.conversationRepository.save(conversation);
    await this.setCache(updated);
    WebSocketService.getInstance().emitToUser(userId, 'chat:history:replaced', {
      sessionId,
      messageCount: messages.length,
    });
    await invalidateDashboardCache(userId);
    return updated;
  }

  async getHistory(
    userId: string,
    sessionId: string,
    limit = 20
  ): Promise<Message[]> {
    const conversation = await this.getConversationForUser(userId, sessionId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (limit <= 0) {
      return [];
    }

    return conversation.messages.slice(-limit);
  }

  async clearConversation(userId: string, sessionId: string): Promise<void> {
    const conversation = await this.getConversationForUser(userId, sessionId);

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    conversation.messages = [];
    conversation.isActive = false;
    conversation.metadata = {
      ...(conversation.metadata || {}),
      clearedAt: new Date().toISOString(),
    };

    await this.conversationRepository.save(conversation);
    await this.removeCache(sessionId);
    await invalidateDashboardCache(userId);
    WebSocketService.getInstance().emitToUser(userId, 'chat:session:cleared', {
      sessionId,
    });
    logger.info('Cleared conversation session', { userId, sessionId });
  }
}
