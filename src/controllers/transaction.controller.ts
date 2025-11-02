import { Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Transaction Controller
 * Handles HTTP requests for transaction endpoints
 */
export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * Get all transactions for current user
   * GET /api/v1/transactions
   */
  getAllTransactions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const {
        categoryId,
        type,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = req.query;

      const result = await this.transactionService.getAllTransactions(req.user.id, {
        categoryId: categoryId as string,
        type: type as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions,
          total: result.total,
          limit: limit ? Number(limit) : 50,
          offset: offset ? Number(offset) : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get transaction by ID
   * GET /api/v1/transactions/:id
   */
  getTransactionById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { id } = req.params;

      const transaction = await this.transactionService.getTransactionById(
        id,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new transaction
   * POST /api/v1/transactions
   */
  createTransaction = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { categoryId, amount, description, type, date, metadata } = req.body;

      const transaction = await this.transactionService.createTransaction(req.user.id, {
        categoryId,
        amount,
        description,
        type,
        date: new Date(date),
        metadata,
      });

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a transaction
   * PUT /api/v1/transactions/:id
   */
  updateTransaction = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { id } = req.params;
      const { categoryId, amount, description, type, date, metadata } = req.body;

      const transaction = await this.transactionService.updateTransaction(
        id,
        req.user.id,
        {
          categoryId,
          amount,
          description,
          type,
          date: date ? new Date(date) : undefined,
          metadata,
        }
      );

      res.status(200).json({
        success: true,
        message: 'Transaction updated successfully',
        data: { transaction },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a transaction
   * DELETE /api/v1/transactions/:id
   */
  deleteTransaction = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { id } = req.params;

      await this.transactionService.deleteTransaction(id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get transaction statistics
   * GET /api/v1/transactions/stats
   */
  getTransactionStats = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { startDate, endDate } = req.query;

      const stats = await this.transactionService.getTransactionStats(
        req.user.id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };
}
