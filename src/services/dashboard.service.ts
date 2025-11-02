import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Transaction, TransactionType } from '../models/transaction.entity';
import { ConversationService } from './conversation.service';
import { CalculationService } from './calculation.service';
import { CategoryService } from './category.service';
import { TransactionService } from './transaction.service';
import { UserService } from './user.service';
import {
  getDashboardCache,
  setDashboardCache,
} from '../utils/cache/dashboard-cache';
import { logger } from '../utils/logger';

interface OverviewResponse {
  profile: any;
  budget: any;
  goals: any;
  categories: any;
  transactions: {
    recent: any[];
    totalCount: number;
  };
}

interface BreakdownResponse {
  categories: Array<{
    id: string;
    name: string;
    budgetAllocated: number;
    spentAmount: number;
    remainingBudget: number;
    utilization: number;
  }>;
  totals: {
    totalBudget: number;
    totalSpent: number;
  };
}

interface SpendingTrendsResponse {
  points: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
}

interface CategoryComparisonResponse {
  categories: Array<{
    id: string;
    name: string;
    spentAmount: number;
    budgetAllocated: number;
  }>;
}

interface InsightItem {
  sessionId: string;
  title: string;
  detail: string;
  timestamp: string;
}

/**
 * DashboardService aggregates user financial data, memoizes results in Redis, and
 * exposes chart-friendly payloads for the frontend dashboard.
 */
export class DashboardService {
  private transactionRepository: Repository<Transaction>;
  private conversationService: ConversationService;
  private calculationService: CalculationService;
  private categoryService: CategoryService;
  private transactionService: TransactionService;
  private userService: UserService;

  constructor() {
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.conversationService = new ConversationService();
    this.calculationService = new CalculationService();
    this.categoryService = new CategoryService();
    this.transactionService = new TransactionService();
    this.userService = new UserService();
  }

  async getOverview(userId: string): Promise<OverviewResponse> {
    const cache = await getDashboardCache<OverviewResponse>(userId, 'overview');
    if (cache) {
      return cache;
    }

    const profile = await this.userService.getFinancialSummary(userId);
    const budgetSummary = await this.calculationService.getBudgetSummary(userId);
    const goals = await this.calculationService.getGoalProgress(userId);
    const categories = await this.categoryService.getCategoriesOverview(userId);

    const recentTransactions = await this.transactionService.getAllTransactions(userId, {
      limit: 10,
      sortBy: 'date',
      sortOrder: 'DESC',
    });

    const payload: OverviewResponse = {
      profile,
      budget: budgetSummary,
      goals,
      categories,
      transactions: {
        recent: recentTransactions.transactions,
        totalCount: recentTransactions.total,
      },
    };

    await setDashboardCache(userId, 'overview', payload);
    return payload;
  }

  async getBudgetBreakdown(userId: string): Promise<BreakdownResponse> {
    const cache = await getDashboardCache<BreakdownResponse>(userId, 'breakdown');
    if (cache) {
      return cache;
    }

    const overview = await this.categoryService.getCategoriesOverview(userId);
    const categories = overview.categories.map((category) => ({
      id: category.id,
      name: category.name,
      budgetAllocated: Number(category.budgetAllocated.toFixed(2)),
      spentAmount: Number(category.spentAmount.toFixed(2)),
      remainingBudget: Number(category.remainingBudget.toFixed(2)),
      utilization: Number(category.percentageUsed.toFixed(2)),
    }));

    const payload: BreakdownResponse = {
      categories,
      totals: {
        totalBudget: Number(overview.totals.totalBudgetAllocated.toFixed(2)),
        totalSpent: Number(overview.totals.totalSpent.toFixed(2)),
      },
    };

    await setDashboardCache(userId, 'breakdown', payload);
    return payload;
  }

  async getSpendingTrends(userId: string, months = 6): Promise<SpendingTrendsResponse> {
    const suffix = `trends:${months}`;
    const cache = await getDashboardCache<SpendingTrendsResponse>(userId, suffix);
    if (cache) {
      return cache;
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);

    const rows = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select("date_trunc('month', transaction.date)", 'month')
      .addSelect(
        `SUM(CASE WHEN transaction.type = :income THEN transaction.amount ELSE 0 END)`,
        'income'
      )
      .addSelect(
        `SUM(CASE WHEN transaction.type = :expense THEN transaction.amount ELSE 0 END)`,
        'expenses'
      )
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.date >= :startDate', { startDate })
      .setParameters({
        income: TransactionType.INCOME,
        expense: TransactionType.EXPENSE,
      })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    const points = rows.map((row) => {
      const monthDate = new Date(row.month);
      const label = `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;

      const income = Number(row.income ?? 0);
      const expenses = Number(row.expenses ?? 0);
      const net = income - expenses;

      return {
        month: label,
        income: Number(income.toFixed(2)),
        expenses: Number(expenses.toFixed(2)),
        net: Number(net.toFixed(2)),
      };
    });

    const payload: SpendingTrendsResponse = { points };
    await setDashboardCache(userId, suffix, payload);
    return payload;
  }

  async getCategoryComparison(userId: string): Promise<CategoryComparisonResponse> {
    const cache = await getDashboardCache<CategoryComparisonResponse>(userId, 'category-comparison');
    if (cache) {
      return cache;
    }

    const overview = await this.categoryService.getCategoriesOverview(userId);
    const categories = overview.categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        spentAmount: Number(category.spentAmount.toFixed(2)),
        budgetAllocated: Number(category.budgetAllocated.toFixed(2)),
      }))
      .sort((a, b) => b.spentAmount - a.spentAmount)
      .slice(0, 5);

    const payload: CategoryComparisonResponse = { categories };
    await setDashboardCache(userId, 'category-comparison', payload);
    return payload;
  }

  async getInsights(userId: string): Promise<InsightItem[]> {
    const conversations = await this.conversationService.getActiveConversationsForUser(userId);

    const insights: InsightItem[] = [];

    conversations.forEach((conversation) => {
      const lastAssistantMessage = [...conversation.messages]
        .reverse()
        .find((msg) => msg.role === 'assistant');

      if (!lastAssistantMessage) {
        return;
      }

      const suggestions = Array.isArray(conversation.metadata?.suggestions)
        ? conversation.metadata?.suggestions
        : [];

      if (suggestions.length === 0) {
        return;
      }

      suggestions.slice(0, 3).forEach((suggestion: string, index: number) => {
        insights.push({
          sessionId: conversation.sessionId,
          title: `Finny Tip ${index + 1}`,
          detail: suggestion,
          timestamp: lastAssistantMessage.timestamp.toISOString(),
        });
      });
    });

    logger.debug('Generated dashboard insights', {
      userId,
      insightCount: insights.length,
    });

    return insights.slice(0, 5);
  }
}
