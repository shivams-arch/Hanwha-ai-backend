import Joi from 'joi';
import { TransactionType } from '../models/transaction.entity';

/**
 * Create Transaction Validation Schema
 */
export const createTransactionSchema = Joi.object({
  categoryId: Joi.string().uuid().optional().allow(null).messages({
    'string.guid': 'Invalid category ID format',
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be a positive number',
    'any.required': 'Amount is required',
  }),
  description: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Description cannot be empty',
    'string.max': 'Description cannot exceed 500 characters',
    'any.required': 'Description is required',
  }),
  type: Joi.string()
    .valid(...Object.values(TransactionType))
    .required()
    .messages({
      'any.required': 'Transaction type is required',
      'any.only': 'Transaction type must be either "income" or "expense"',
    }),
  date: Joi.date().iso().required().messages({
    'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
    'any.required': 'Date is required',
  }),
  metadata: Joi.object().optional(),
});

/**
 * Update Transaction Validation Schema
 */
export const updateTransactionSchema = Joi.object({
  categoryId: Joi.string().uuid().optional().allow(null).messages({
    'string.guid': 'Invalid category ID format',
  }),
  amount: Joi.number().positive().optional().messages({
    'number.positive': 'Amount must be a positive number',
  }),
  description: Joi.string().min(1).max(500).optional().messages({
    'string.min': 'Description cannot be empty',
    'string.max': 'Description cannot exceed 500 characters',
  }),
  type: Joi.string()
    .valid(...Object.values(TransactionType))
    .optional()
    .messages({
      'any.only': 'Transaction type must be either "income" or "expense"',
    }),
  date: Joi.date().iso().optional().messages({
    'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
  }),
  metadata: Joi.object().optional(),
}).min(1); // At least one field must be provided

/**
 * Transaction ID Param Validation Schema
 */
export const transactionIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid transaction ID format',
    'any.required': 'Transaction ID is required',
  }),
});

/**
 * Query Parameters for Get Transactions
 */
export const getTransactionsQuerySchema = Joi.object({
  categoryId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...Object.values(TransactionType))
    .optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().positive().optional(),
  sortBy: Joi.string().valid('date', 'amount', 'createdAt').optional().default('date'),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional().default('DESC'),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
  offset: Joi.number().integer().min(0).optional().default(0),
});
