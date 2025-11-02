import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../models/transaction.entity';
import { Category } from '../models/category.entity';
import { AppDataSource } from '../config/database.config';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { invalidateUserCalculations } from '../utils/cache/calculation-cache';
import { invalidateDashboardCache } from '../utils/cache/dashboard-cache';
import { WebSocketService } from '../websockets/socket.service';

/**
 * Transaction Response Interface
 */
export interface TransactionResponse {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName?: string;
  amount: number;
  description: string;
  type: TransactionType;
  date: Date;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Transaction DTO
 */
export interface CreateTransactionDto {
  categoryId?: string | null;
  amount: number;
  description: string;
  type: TransactionType;
  date: Date;
  metadata?: Record<string, any>;
}

/**
 * Update Transaction DTO
 */
export interface UpdateTransactionDto {
  categoryId?: string | null;
  amount?: number;
  description?: string;
  type?: TransactionType;
  date?: Date;
  metadata?: Record<string, any>;
}

/**
 * Transaction Filters
 */
export interface TransactionFilters {
  categoryId?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

/**
 * Transaction Service
 * Handles transaction management operations
 */
export class TransactionService {
  private transactionRepository: Repository<Transaction>;
  private categoryRepository: Repository<Category>;

  constructor() {
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.categoryRepository = AppDataSource.getRepository(Category);
  }

  /**
   * Create a new transaction
   */
  async createTransaction(userId: string, data: CreateTransactionDto): Promise<TransactionResponse> {
    // Validate category if provided
    if (data.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: data.categoryId, userId },
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    const transaction = this.transactionRepository.create({
      userId,
      categoryId: data.categoryId,
      amount: data.amount,
      description: data.description,
      type: data.type,
      date: data.date,
      metadata: data.metadata,
    });

    await this.transactionRepository.save(transaction);

    // Update category spent amount if it's an expense
    if (data.categoryId && data.type === TransactionType.EXPENSE) {
      await this.updateCategorySpentAmount(data.categoryId);
    }

    logger.info(
      `Created ${data.type} transaction of $${data.amount} for user: ${userId}`
    );

    await invalidateUserCalculations(userId);
    await invalidateDashboardCache(userId);
    WebSocketService.getInstance().emitToUser(userId, 'dashboard:update', {
      type: 'transaction',
      action: 'created',
      transactionId: transaction.id,
    });

    return this.formatTransaction(transaction);
  }

  /**
   * Get all transactions for a user with filters
   */
  async getAllTransactions(
    userId: string,
    filters?: TransactionFilters
  ): Promise<{ transactions: TransactionResponse[]; total: number }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId });

    // Apply filters
    if (filters?.categoryId) {
      queryBuilder.andWhere('transaction.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: filters.type });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('transaction.date BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters?.startDate) {
      queryBuilder.andWhere('transaction.date >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters?.endDate) {
      queryBuilder.andWhere('transaction.date <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters?.minAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount >= :minAmount', {
        minAmount: filters.minAmount,
      });
    }

    if (filters?.maxAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount <= :maxAmount', {
        maxAmount: filters.maxAmount,
      });
    }

    // Sorting
    const sortBy = filters?.sortBy || 'date';
    const sortOrder = filters?.sortOrder || 'DESC';
    queryBuilder.orderBy(`transaction.${sortBy}`, sortOrder);

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    queryBuilder.skip(offset).take(limit);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    logger.debug(
      `Retrieved ${transactions.length} of ${total} transactions for user: ${userId}`
    );

    return {
      transactions: transactions.map((t) => this.formatTransaction(t)),
      total,
    };
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string, userId: string): Promise<TransactionResponse> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['category'],
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return this.formatTransaction(transaction);
  }

  /**
   * Update a transaction
   */
  async updateTransaction(
    transactionId: string,
    userId: string,
    data: UpdateTransactionDto
  ): Promise<TransactionResponse> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['category'],
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const oldCategoryId = transaction.categoryId;
    const oldAmount = transaction.amount;
    const oldType = transaction.type;

    // Validate new category if provided
    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        const category = await this.categoryRepository.findOne({
          where: { id: data.categoryId, userId },
        });

        if (!category) {
          throw new NotFoundError('Category not found');
        }
      }
      transaction.categoryId = data.categoryId;
    }

    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        throw new ValidationError('Amount must be positive');
      }
      transaction.amount = data.amount;
    }

    if (data.description !== undefined) {
      transaction.description = data.description;
    }

    if (data.type !== undefined) {
      transaction.type = data.type;
    }

    if (data.date !== undefined) {
      transaction.date = data.date;
    }

    if (data.metadata !== undefined) {
      transaction.metadata = data.metadata;
    }

    await this.transactionRepository.save(transaction);

    // Update category spent amounts if relevant fields changed
    const categoryChanged = data.categoryId !== undefined && data.categoryId !== oldCategoryId;
    const amountChanged = data.amount !== undefined && data.amount !== oldAmount;
    const typeChanged = data.type !== undefined && data.type !== oldType;

    if (categoryChanged || amountChanged || typeChanged) {
      // Update old category if it exists
      if (oldCategoryId) {
        await this.updateCategorySpentAmount(oldCategoryId);
      }
      // Update new category if it exists and is different
      if (transaction.categoryId && transaction.categoryId !== oldCategoryId) {
        await this.updateCategorySpentAmount(transaction.categoryId);
      }
    }

    logger.info(`Updated transaction ${transactionId} for user: ${userId}`);
    await invalidateUserCalculations(userId);
    await invalidateDashboardCache(userId);
    WebSocketService.getInstance().emitToUser(userId, 'dashboard:update', {
      type: 'transaction',
      action: 'updated',
      transactionId,
    });
    return this.formatTransaction(transaction);
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(transactionId: string, userId: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const categoryId = transaction.categoryId;

    await this.transactionRepository.remove(transaction);

    // Update category spent amount if it was an expense with a category
    if (categoryId && transaction.type === TransactionType.EXPENSE) {
      await this.updateCategorySpentAmount(categoryId);
    }

    logger.info(`Deleted transaction ${transactionId} for user: ${userId}`);
    await invalidateUserCalculations(userId);
    await invalidateDashboardCache(userId);
    WebSocketService.getInstance().emitToUser(userId, 'dashboard:update', {
      type: 'transaction',
      action: 'deleted',
      transactionId,
    });
  }

  /**
   * Get transaction statistics for a user
   */
  async getTransactionStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    transactionCount: number;
    averageTransaction: number;
  }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    if (startDate && endDate) {
      queryBuilder.andWhere('transaction.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const transactions = await queryBuilder.getMany();

    const totalIncome = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;
    const transactionCount = transactions.length;
    const averageTransaction =
      transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0;

    return {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netCashFlow: Number(netCashFlow.toFixed(2)),
      transactionCount,
      averageTransaction: Number(averageTransaction.toFixed(2)),
    };
  }

  /**
   * Update category spent amount based on transactions
   */
  private async updateCategorySpentAmount(categoryId: string): Promise<void> {
    const transactions = await this.transactionRepository.find({
      where: { categoryId, type: TransactionType.EXPENSE },
    });

    const spentAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    await this.categoryRepository.update(categoryId, { spentAmount });

    logger.debug(`Updated spent amount for category ${categoryId}: ${spentAmount}`);
  }

  /**
   * Format transaction for response
   */
  private formatTransaction(transaction: Transaction): TransactionResponse {
    return {
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
    };
  }
}
