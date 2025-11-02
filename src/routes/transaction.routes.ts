import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
  getTransactionsQuerySchema,
} from '../validators/transaction.validator';

const router = Router();
const transactionController = new TransactionController();

/**
 * Transaction Routes
 * Base path: /api/v1/transactions
 */

/**
 * @route   GET /api/v1/transactions/stats
 * @desc    Get transaction statistics for current user
 * @access  Private
 * @note    This route must be before /:id to avoid route conflicts
 */
router.get('/stats', authenticate, transactionController.getTransactionStats);

/**
 * @route   GET /api/v1/transactions
 * @desc    Get all transactions for current user with filters
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validate(getTransactionsQuerySchema, 'query'),
  transactionController.getAllTransactions
);

/**
 * @route   POST /api/v1/transactions
 * @desc    Create a new transaction
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createTransactionSchema, 'body'),
  transactionController.createTransaction
);

/**
 * @route   GET /api/v1/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  validate(transactionIdParamSchema, 'params'),
  transactionController.getTransactionById
);

/**
 * @route   PUT /api/v1/transactions/:id
 * @desc    Update a transaction
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  validate(transactionIdParamSchema, 'params'),
  validate(updateTransactionSchema, 'body'),
  transactionController.updateTransaction
);

/**
 * @route   DELETE /api/v1/transactions/:id
 * @desc    Delete a transaction
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  validate(transactionIdParamSchema, 'params'),
  transactionController.deleteTransaction
);

export default router;
