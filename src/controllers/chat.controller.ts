import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChatService } from '../services/chat.service';
import { logger } from '../utils/logger';

// TODO: Remove this default test user UUID after implementing proper authentication
const TEST_USER_UUID = '00000000-0000-0000-0000-000000000001';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  sendMessage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // TODO: Remove this default user after implementing proper authentication
      const userId = req.user?.id || TEST_USER_UUID;

      const result = await this.chatService.sendMessage({
        userId,
        sessionId: req.body.sessionId,
        message: req.body.message,
        metadata: req.body.metadata,
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId: result.sessionId,
          reply: result.reply,
          suggestions: result.suggestions,
          metrics: result.metrics,
          metadata: result.metadata,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // TODO: Remove this default user after implementing proper authentication
      const userId = req.user?.id || TEST_USER_UUID;

      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const messages = await this.chatService.getConversationHistory(
        userId,
        req.params.sessionId,
        limit
      );

      res.status(200).json({
        success: true,
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  };

  clearSession = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // TODO: Remove this default user after implementing proper authentication
      const userId = req.user?.id || TEST_USER_UUID;

      await this.chatService.clearConversation(userId, req.params.sessionId);

      res.status(200).json({
        success: true,
        message: 'Conversation cleared',
      });
    } catch (error) {
      next(error);
    }
  };

  createSession = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // TODO: Remove this default user after implementing proper authentication
      const userId = req.user?.id || TEST_USER_UUID;

      const sessionId = await this.chatService.createSession(userId);

      res.status(201).json({
        success: true,
        data: { sessionId },
      });
    } catch (error) {
      next(error);
    }
  };

  handleN8nResponse = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, sessionId, reply, suggestions, metrics, metadata } = req.body;

      await this.chatService.processWebhookResponse({
        userId,
        sessionId,
        reply,
        suggestions,
        metrics,
        metadata,
      });

      logger.info('Processed n8n webhook response', { userId, sessionId });

      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  };
}
