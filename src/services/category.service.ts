import { In, Repository } from 'typeorm';
import { Category, CategoryType } from '../models/category.entity';
import { Transaction, TransactionType } from '../models/transaction.entity';
import { AppDataSource } from '../config/database.config';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import type { TransactionResponse } from './transaction.service';
import { invalidateUserCalculations } from '../utils/cache/calculation-cache';
import { invalidateDashboardCache } from '../utils/cache/dashboard-cache';
import { WebSocketService } from '../websockets/socket.service';

/**
 * Category Response Interface
 */
export interface CategoryResponse {
  id: string;
  userId: string;
  name: CategoryType;
  budgetAllocated: number;
  spentAmount: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Category DTO
 */
export interface CreateCategoryDto {
  name: CategoryType;
  budgetAllocated?: number;
  description?: string;
}

/**
 * Update Category DTO
 */
export interface UpdateCategoryDto {
  name?: CategoryType;
  budgetAllocated?: number;
  spentAmount?: number;
  description?: string;
}

/**
 * Category Summary Interface
 */
export interface CategorySummary {
  id: string;
  name: CategoryType;
  budgetAllocated: number;
  spentAmount: number;
  remainingBudget: number;
  percentageUsed: number;
  transactionCount: number;
  lastTransactionDate: Date | null;
}

/**
 * Category summary with display metadata
 */
export interface CategorySummaryWithMeta extends CategorySummary {
  description: string | null;
}

/**
 * Aggregated category overview for dashboards
 */
export interface CategoryOverview {
  totals: {
    totalCategories: number;
    totalBudgetAllocated: number;
    totalSpent: number;
    totalRemainingBudget: number;
    averageBudgetUtilization: number;
    overBudgetCount: number;
  };
  categories: CategorySummaryWithMeta[];
  overBudgetCategories: CategorySummaryWithMeta[];
}

/**
 * Category Service
 * Handles category management operations
 */
export class CategoryService {
  private categoryRepository: Repository<Category>;
  private transactionRepository: Repository<Transaction>;

  constructor() {
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
  }

  /**
   * Create default categories for a new user
   */
  async createDefaultCategories(userId: string): Promise<CategoryResponse[]> {
    const defaultCategories = [
      { name: CategoryType.FINANCE, budgetAllocated: 0, description: 'Financial planning and expenses' },
      { name: CategoryType.EDUCATION, budgetAllocated: 0, description: 'Education and learning expenses' },
      { name: CategoryType.FAMILY, budgetAllocated: 0, description: 'Family-related expenses' },
      { name: CategoryType.FRIENDS, budgetAllocated: 0, description: 'Social activities with friends' },
      { name: CategoryType.VACATION, budgetAllocated: 0, description: 'Weekend activities and vacations' },
    ];

    const categories: Category[] = [];

    for (const defaultCategory of defaultCategories) {
      const category = this.categoryRepository.create({
        userId,
        name: defaultCategory.name,
        budgetAllocated: defaultCategory.budgetAllocated,
        spentAmount: 0,
        description: defaultCategory.description,
      });
      categories.push(category);
    }

    await this.categoryRepository.save(categories);

    logger.info(`Created default categories for user: ${userId}`);
    return categories.map((cat) => this.formatCategory(cat));
  }

  /**
   * Get all categories for a user
   */
  async getAllCategories(
    userId: string,
    filters?: {
      name?: CategoryType;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ): Promise<CategoryResponse[]> {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.userId = :userId', { userId });

    if (filters?.name) {
      queryBuilder.andWhere('category.name = :name', { name: filters.name });
    }

    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'ASC';
    queryBuilder.orderBy(`category.${sortBy}`, sortOrder);

    const categories = await queryBuilder.getMany();

    logger.debug(`Retrieved ${categories.length} categories for user: ${userId}`);
    return categories.map((cat) => this.formatCategory(cat));
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string, userId: string): Promise<CategoryResponse> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return this.formatCategory(category);
  }

  /**
   * Create a new category
   */
  async createCategory(userId: string, data: CreateCategoryDto): Promise<CategoryResponse> {
    // Check if category with this name already exists for user
    const existingCategory = await this.categoryRepository.findOne({
      where: { userId, name: data.name },
    });

    if (existingCategory) {
      throw new ConflictError(`Category '${data.name}' already exists for this user`);
    }

    const category = this.categoryRepository.create({
      userId,
      name: data.name,
      budgetAllocated: data.budgetAllocated || 0,
      spentAmount: 0,
      description: data.description,
    });

    await this.categoryRepository.save(category);

    logger.info(`Created category '${data.name}' for user: ${userId}`);
    await invalidateUserCalculations(userId);
    await invalidateDashboardCache(userId);
    WebSocketService.getInstance().emitToUser(userId, 'dashboard:update', {
      type: 'category',
      action: 'created',
      categoryId: category.id,
    });
    return this.formatCategory(category);
  }

  /**
   * Update a category
   */
  async updateCategory(
    categoryId: string,
    userId: string,
    data: UpdateCategoryDto
  ): Promise<CategoryResponse> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // If changing name, check for conflicts
    if (data.name && data.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { userId, name: data.name },
      });

      if (existingCategory) {
        throw new ConflictError(`Category '${data.name}' already exists for this user`);
      }
      category.name = data.name;
    }

    if (data.budgetAllocated !== undefined) {
      if (data.budgetAllocated < 0) {
        throw new ValidationError('Budget allocated cannot be negative');
      }
      category.budgetAllocated = data.budgetAllocated;
    }

    if (data.spentAmount !== undefined) {
      if (data.spentAmount < 0) {
        throw new ValidationError('Spent amount cannot be negative');
      }
      category.spentAmount = data.spentAmount;
    }

    if (data.description !== undefined) {
      category.description = data.description || '';
    }

    await this.categoryRepository.save(category);

    logger.info(`Updated category ${categoryId} for user: ${userId}`);
    await invalidateUserCalculations(userId);
    await invalidateDashboardCache(userId);
    WebSocketService.getInstance().emitToUser(userId, 'dashboard:update', {
      type: 'category',
      action: 'updated',
      categoryId,
    });
    return this.formatCategory(category);
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string, userId: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check if category has transactions
    const transactionCount = await this.transactionRepository.count({
      where: { categoryId },
    });

    if (transactionCount > 0) {
      throw new ValidationError(
        `Cannot delete category with ${transactionCount} transaction(s). Please reassign or delete transactions first.`
      );
    }

    await this.categoryRepository.remove(category);

    logger.info(`Deleted category ${categoryId} for user: ${userId}`);
    await invalidateUserCalculations(userId);
    await invalidateDashboardCache(userId);
    WebSocketService.getInstance().emitToUser(userId, 'dashboard:update', {
      type: 'category',
      action: 'deleted',
      categoryId,
    });
  }

  /**
   * Get category transactions
   */
  async getCategoryTransactions(categoryId: string, userId: string): Promise<TransactionResponse[]> {
    // Verify category belongs to user
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const transactions = await this.transactionRepository.find({
      where: { categoryId },
      order: { date: 'DESC' },
      relations: ['category'],
    });

    logger.debug(`Retrieved ${transactions.length} transactions for category: ${categoryId}`);
    return transactions.map((transaction) => ({
      id: transaction.id,
      userId: transaction.userId,
      categoryId: transaction.categoryId || null,
      categoryName: transaction.category?.name,
      amount: Number(transaction.amount),
      description: transaction.description,
      type: transaction.type,
      date: transaction.date,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }));
  }

  /**
   * Get category spending summary
   */
  async getCategorySummary(categoryId: string, userId: string): Promise<CategorySummary> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Get transaction stats
    const transactions = await this.transactionRepository.find({
      where: { categoryId },
      order: { date: 'DESC' },
    });

    const transactionCount = transactions.length;
    const lastTransactionDate = transactionCount > 0 ? transactions[0].date : null;

    // Calculate spent amount from transactions
    const actualSpentAmount = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Update category spent amount if it's different
    if (actualSpentAmount !== Number(category.spentAmount)) {
      category.spentAmount = actualSpentAmount;
      await this.categoryRepository.save(category);
    }

    const remainingBudget = Number(category.budgetAllocated) - actualSpentAmount;
    const percentageUsed =
      Number(category.budgetAllocated) > 0
        ? (actualSpentAmount / Number(category.budgetAllocated)) * 100
        : 0;

    return {
      id: category.id,
      name: category.name,
      budgetAllocated: Number(category.budgetAllocated),
      spentAmount: actualSpentAmount,
      remainingBudget,
      percentageUsed: Number(percentageUsed.toFixed(2)),
      transactionCount,
      lastTransactionDate,
    };
  }

  /**
   * Get aggregated overview of categories for dashboard consumption
   */
  async getCategoriesOverview(userId: string): Promise<CategoryOverview> {
    const categories = await this.categoryRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    if (categories.length === 0) {
      return {
        totals: {
          totalCategories: 0,
          totalBudgetAllocated: 0,
          totalSpent: 0,
          totalRemainingBudget: 0,
          averageBudgetUtilization: 0,
          overBudgetCount: 0,
        },
        categories: [],
        overBudgetCategories: [],
      };
    }

    const categoryIds = categories.map((category) => category.id);

    const transactions =
      categoryIds.length > 0
        ? await this.transactionRepository.find({
            where: {
              userId,
              categoryId: In(categoryIds),
            },
            order: { date: 'DESC' },
          })
        : [];

    const transactionsByCategory = new Map<string, Transaction[]>();

    for (const transaction of transactions) {
      if (!transaction.categoryId) {
        continue;
      }

      const existing = transactionsByCategory.get(transaction.categoryId) || [];
      existing.push(transaction);
      transactionsByCategory.set(transaction.categoryId, existing);
    }

    const categoriesWithSummary: CategorySummaryWithMeta[] = [];

    for (const category of categories) {
      const categoryTransactions = transactionsByCategory.get(category.id) || [];
      const expenseTransactions = categoryTransactions.filter(
        (txn) => txn.type === TransactionType.EXPENSE
      );

      const spentAmount = Number(
        expenseTransactions.reduce((sum, txn) => sum + Number(txn.amount), 0).toFixed(2)
      );

      const currentStoredSpent = Number(category.spentAmount);

      if (Math.abs(spentAmount - currentStoredSpent) > 0.01) {
        await this.categoryRepository.update(category.id, { spentAmount });
      }

      const budgetAllocated = Number(category.budgetAllocated);
      const remainingBudget = Number((budgetAllocated - spentAmount).toFixed(2));
      const percentageUsed =
        budgetAllocated > 0 ? Number(((spentAmount / budgetAllocated) * 100).toFixed(2)) : 0;

      let lastTransactionDate: Date | null = null;
      for (const txn of categoryTransactions) {
        if (!lastTransactionDate || txn.date > lastTransactionDate) {
          lastTransactionDate = txn.date;
        }
      }

      categoriesWithSummary.push({
        id: category.id,
        name: category.name,
        budgetAllocated,
        spentAmount,
        remainingBudget,
        percentageUsed,
        transactionCount: categoryTransactions.length,
        lastTransactionDate,
        description: category.description ?? null,
      });
    }

    const totalBudgetAllocated = Number(
      categoriesWithSummary.reduce((sum, cat) => sum + cat.budgetAllocated, 0).toFixed(2)
    );
    const totalSpent = Number(
      categoriesWithSummary.reduce((sum, cat) => sum + cat.spentAmount, 0).toFixed(2)
    );
    const totalRemainingBudget = Number((totalBudgetAllocated - totalSpent).toFixed(2));

    const averageBudgetUtilization =
      totalBudgetAllocated > 0
        ? Number(((totalSpent / totalBudgetAllocated) * 100).toFixed(2))
        : 0;

    const overBudgetCategories = categoriesWithSummary.filter((cat) => cat.remainingBudget < 0);

    logger.debug(`Generated category overview for user ${userId}`);

    return {
      totals: {
        totalCategories: categoriesWithSummary.length,
        totalBudgetAllocated,
        totalSpent,
        totalRemainingBudget,
        averageBudgetUtilization,
        overBudgetCount: overBudgetCategories.length,
      },
      categories: categoriesWithSummary,
      overBudgetCategories,
    };
  }

  /**
   * Recalculate spent amount for a category based on transactions
   */
  async recalculateSpentAmount(categoryId: string): Promise<void> {
    const transactions = await this.transactionRepository.find({
      where: { categoryId, type: TransactionType.EXPENSE },
    });

    const spentAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    await this.categoryRepository.update(categoryId, { spentAmount });

    logger.debug(`Recalculated spent amount for category ${categoryId}: ${spentAmount}`);
  }

  /**
   * Format category for response
   */
  private formatCategory(category: Category): CategoryResponse {
    return {
      id: category.id,
      userId: category.userId,
      name: category.name,
      budgetAllocated: Number(category.budgetAllocated),
      spentAmount: Number(category.spentAmount),
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
