import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { envConfig } from '../config/env.config';
import { logger } from '../utils/logger';
import { ConversationService } from './conversation.service';
import { Message } from '../models/conversation.entity';
import { CalculationService, ScenarioType } from './calculation.service';
import { UserService } from './user.service';
import { CategoryService } from './category.service';
import { NotFoundError } from '../middleware/error.middleware';

interface ChatContext {
  profile: any;
  budgetSummary: any;
  goals: any;
  topCategories: any;
  educationGoals?: any;
}

interface SendMessageOptions {
  userId: string;
  sessionId?: string;
  message: string;
  metadata?: Record<string, any>;
}

type ChartType = 'bar' | 'pie';

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  stack?: string;
}

interface ChartMetric {
  id: string;
  title: string;
  type: ChartType;
  labels: string[];
  datasets: ChartDataset[];
  summary?: string;
  unit?: string;
}

interface N8nResponsePayload {
  reply?: string;
  message?: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
  metrics?: ChartMetric[];
  data?: Record<string, any>;
}

interface ChatResult {
  sessionId: string;
  reply: string;
  suggestions: string[];
  metrics: ChartMetric[];
  metadata?: Record<string, any>;
}

export class ChatService {
  private axiosClient: AxiosInstance;
  private conversationService: ConversationService;
  private calculationService: CalculationService;
  private userService: UserService;
  private categoryService: CategoryService;

  constructor() {
    this.axiosClient = axios.create({
      baseURL: envConfig.N8N_WEBHOOK_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 1000 * 45,
    });

    this.conversationService = new ConversationService();
    this.calculationService = new CalculationService();
    this.userService = new UserService();
    this.categoryService = new CategoryService();
  }

  private async buildContext(userId: string): Promise<ChatContext> {
    const [profile, budgetSummary, goals, categories] = await Promise.all([
      this.userService.getUserProfile(userId),
      this.calculationService.getBudgetSummary(userId),
      this.calculationService.getGoalProgress(userId),
      this.categoryService.getAllCategories(userId),
    ]);

    const topCategories = budgetSummary.expenses.topCategories || categories.slice(0, 3);

    const educationGoals = goals.filter((goal: any) => {
      const type = typeof goal?.goalType === 'string' ? goal.goalType.toLowerCase() : '';
      const metricUnit = typeof goal?.metricUnit === 'string' ? goal.metricUnit.toLowerCase() : '';
      return type === 'education' || metricUnit === 'hours';
    });

    return {
      profile,
      budgetSummary,
      goals,
      topCategories,
      educationGoals,
    };
  }

  private normalizeReply(payload: N8nResponsePayload | undefined): ChatResult {
    const reply = payload?.reply || payload?.message || 'Finny could not process that request right now.';
    const suggestions = Array.isArray(payload?.suggestions) ? payload?.suggestions : [];
    const metadata = (payload?.metadata ?? payload?.data) as Record<string, any> | undefined;
    const metadataMetrics =
      metadata && Array.isArray(metadata?.metrics) ? (metadata.metrics as ChartMetric[]) : undefined;
    const metricsSource = payload?.metrics || metadataMetrics;
    const metrics = Array.isArray(metricsSource) ? metricsSource : [];

    return {
      sessionId: '',
      reply,
      suggestions,
      metrics,
      metadata,
    };
  }

  async createSession(userId: string): Promise<string> {
    const sessionId = randomUUID();

    logger.info('Created new chat session', { userId, sessionId });

    return sessionId;
  }

  async sendMessage(options: SendMessageOptions): Promise<ChatResult> {
    const sessionId = options.sessionId || randomUUID();

    const userMessage: Message = {
      role: 'user',
      content: options.message,
      timestamp: new Date(),
    };

    await this.conversationService.appendMessage(
      options.userId,
      sessionId,
      userMessage,
      options.metadata
    );

    try {
      const [context, history] = await Promise.all([
        this.buildContext(options.userId),
        this.conversationService.getHistory(options.userId, sessionId, 10),
      ]);

      const payload = {
        sessionId,
        userId: options.userId,
        message: options.message,
        history: history.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        })),
        context,
      };

      const response = await this.axiosClient.post<N8nResponsePayload>(
        envConfig.N8N_FINANCE_ASSISTANT_WEBHOOK,
        payload,
        {
          headers: envConfig.N8N_API_KEY
            ? {
                'x-api-key': envConfig.N8N_API_KEY,
              }
            : undefined,
        }
      );

      const result = this.normalizeReply(response.data);
      result.sessionId = sessionId;

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(),
      };

      await this.conversationService.appendMessage(
        options.userId,
        sessionId,
        assistantMessage,
        {
          suggestions: result.suggestions,
          metrics: result.metrics,
          metadata: result.metadata,
        }
      );

      return result;
    } catch (error) {
      logger.error('n8n request failed', {
        userId: options.userId,
        sessionId,
        error: (error as Error)?.message,
      });

      const fallbackReply =
        'Finny hit a snag reaching the AI workflow. Try again in a few seconds while I reconnect the tubes.';

      const assistantMessage: Message = {
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date(),
      };

      await this.conversationService.appendMessage(
        options.userId,
        sessionId,
        assistantMessage,
        {
          error: true,
        }
      );

      return {
        sessionId,
        reply: fallbackReply,
        suggestions: [],
        metrics: [],
      };
    }
  }

  async processWebhookResponse(payload: {
    userId: string;
    sessionId: string;
    reply: string;
    suggestions?: string[];
    metrics?: ChartMetric[];
    metadata?: Record<string, any>;
  }): Promise<void> {
    const conversation = await this.conversationService.getConversationForUser(
      payload.userId,
      payload.sessionId
    );

    if (!conversation) {
      throw new NotFoundError('Conversation not found for webhook response');
    }

    const assistantMessage: Message = {
      role: 'assistant',
      content: payload.reply,
      timestamp: new Date(),
    };

    await this.conversationService.appendMessage(
      payload.userId,
      payload.sessionId,
      assistantMessage,
      {
        suggestions: payload.suggestions || [],
        metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
        metadata: payload.metadata,
        source: 'webhook',
      }
    );
  }

  async clearConversation(userId: string, sessionId: string): Promise<void> {
    await this.conversationService.clearConversation(userId, sessionId);
  }

  async getConversationHistory(
    userId: string,
    sessionId: string,
    limit = 30
  ): Promise<Message[]> {
    return this.conversationService.getHistory(userId, sessionId, limit);
  }

  async runQuickAffordabilityCheck(
    userId: string,
    payload: Record<string, any>
  ): Promise<ScenarioType> {
    await this.calculationService.evaluateAffordability(userId, payload);
    return ScenarioType.CAN_I_AFFORD;
  }
}
