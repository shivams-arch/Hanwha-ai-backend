import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { User } from '../models/user.entity';
import { Category } from '../models/category.entity';
import { Transaction } from '../models/transaction.entity';
import { FinancialGoal } from '../models/financial-goal.entity';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';
import {
  BudgetCalculator,
  BudgetSummary,
} from '../utils/calculations/budget-calculator';
import { ScenarioEngine, ScenarioResult, ScenarioType } from '../utils/calculations/scenario-engine';
import { ProjectionEngine, ProjectionResult } from '../utils/calculations/projection-engine';
import {
  buildBudgetCacheKey,
  buildScenarioCacheKey,
  getCalculationCache,
  setCalculationCache,
} from '../utils/cache/calculation-cache';
import {
  buildGoalProgress,
  GoalProgress,
} from '../utils/calculations/goal-progress';

const DEFAULT_BUDGET_TIMEFRAME = 30;
const MAX_TIMEFRAME = 180;
const MIN_TIMEFRAME = 7;

const clampTimeframe = (days?: number): number => {
  if (!days || Number.isNaN(days)) {
    return DEFAULT_BUDGET_TIMEFRAME;
  }

  return Math.min(Math.max(Math.floor(days), MIN_TIMEFRAME), MAX_TIMEFRAME);
};

export interface BudgetRequestOptions {
  timeframeDays?: number;
}

export interface ProjectionRequestOptions {
  periodMonths?: number;
  incomeGrowthRatePercent?: number;
  expenseGrowthRatePercent?: number;
}

export class CalculationService {
  private userRepository: Repository<User>;
  private categoryRepository: Repository<Category>;
  private transactionRepository: Repository<Transaction>;
  private goalRepository: Repository<FinancialGoal>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.goalRepository = AppDataSource.getRepository(FinancialGoal);
  }

  /**
   * Generate budget overview for the authenticated user
   */
  async getBudgetSummary(userId: string, options?: BudgetRequestOptions): Promise<BudgetSummary> {
    const timeframeDays = clampTimeframe(options?.timeframeDays);
    const cacheKey = buildBudgetCacheKey(userId, `budget:${timeframeDays}`);

    const cached = await getCalculationCache<BudgetSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [categories, transactions, goals] = await Promise.all([
      this.categoryRepository.find({ where: { userId } }),
      this.fetchTransactions(userId, timeframeDays),
      this.goalRepository.find({ where: { userId } }),
    ]);

    const summary = BudgetCalculator.calculate({
      profileData: user.profileData,
      categories,
      transactions,
      goals,
      timeframeDays,
    });

    await setCalculationCache(cacheKey, summary);
    return summary;
  }

  /**
   * Run a financial scenario for the user
   */
  async runScenario(
    userId: string,
    scenarioType: ScenarioType,
    data: Record<string, any>
  ): Promise<ScenarioResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const budgetSummary = await this.getBudgetSummary(userId);
    const context = {
      profileData: user.profileData,
      monthlyIncome: budgetSummary.income.monthly,
      monthlyExpenses:
        budgetSummary.expenses.fixedMonthly + budgetSummary.expenses.variableMonthly,
      disposableIncome: budgetSummary.cashFlow.disposableIncome,
      bankBalance: user.profileData?.bankAccountBalance ?? 0,
    };

    const payload = { type: scenarioType, data, context };
    const cacheKey = buildScenarioCacheKey(userId, scenarioType, data);
    const cached = await getCalculationCache<ScenarioResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = ScenarioEngine.evaluate(payload);
    await setCalculationCache(cacheKey, result);
    return result;
  }

  /**
   * Generate income/expense projections
   */
  async getProjections(
    userId: string,
    options?: ProjectionRequestOptions
  ): Promise<ProjectionResult> {
    const periodMonths = Math.min(Math.max(Math.floor(options?.periodMonths ?? 6), 1), 24);
    const incomeGrowthRatePercent = options?.incomeGrowthRatePercent;
    const expenseGrowthRatePercent = options?.expenseGrowthRatePercent;

    const cacheKey = buildBudgetCacheKey(
      userId,
      `projection:${periodMonths}:${incomeGrowthRatePercent ?? 'd'}:${expenseGrowthRatePercent ?? 'd'}`
    );
    const cached = await getCalculationCache<ProjectionResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const transactions = await this.fetchTransactions(userId, 180);

    if (transactions.length === 0) {
      throw new ValidationError('Not enough transaction data to generate projections');
    }

    const result = ProjectionEngine.generate({
      transactions,
      periodMonths,
      incomeGrowthRatePercent,
      expenseGrowthRatePercent,
    });

    await setCalculationCache(cacheKey, result);
    return result;
  }

  /**
   * Convenience helper for affordability endpoint
   */
  async evaluateAffordability(
    userId: string,
    payload: Record<string, any>
  ): Promise<ScenarioResult> {
    return this.runScenario(userId, ScenarioType.CAN_I_AFFORD, payload);
  }

  /**
   * Get goal progress with calculated percentages
   */
  async getGoalProgress(userId: string): Promise<GoalProgress[]> {
    const goals = await this.goalRepository.find({ where: { userId } });

    return goals.map((goal) => buildGoalProgress(goal));
  }

  private async fetchTransactions(userId: string, timeframeDays: number): Promise<Transaction[]> {
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.date >= :startDate', { startDate })
      .orderBy('transaction.date', 'DESC')
      .getMany();
  }
}

export { ScenarioType };
