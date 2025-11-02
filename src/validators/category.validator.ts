import Joi from 'joi';
import { CategoryType } from '../models/category.entity';

/**
 * Create Category Validation Schema
 */
export const createCategorySchema = Joi.object({
  name: Joi.string()
    .valid(...Object.values(CategoryType))
    .required()
    .messages({
      'any.required': 'Category name is required',
      'any.only': 'Category name must be one of: Finance, Education, Family, Friends, Weekend Activities/Vacation',
    }),
  budgetAllocated: Joi.number().min(0).default(0).optional().messages({
    'number.min': 'Budget allocated cannot be negative',
  }),
  description: Joi.string().max(500).optional().allow('', null),
});

/**
 * Update Category Validation Schema
 */
export const updateCategorySchema = Joi.object({
  name: Joi.string()
    .valid(...Object.values(CategoryType))
    .optional()
    .messages({
      'any.only': 'Category name must be one of: Finance, Education, Family, Friends, Weekend Activities/Vacation',
    }),
  budgetAllocated: Joi.number().min(0).optional().messages({
    'number.min': 'Budget allocated cannot be negative',
  }),
  spentAmount: Joi.number().min(0).optional().messages({
    'number.min': 'Spent amount cannot be negative',
  }),
  description: Joi.string().max(500).optional().allow('', null),
}).min(1); // At least one field must be provided

/**
 * Category ID Param Validation Schema
 */
export const categoryIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid category ID format',
    'any.required': 'Category ID is required',
  }),
});

/**
 * Query Parameters for Get Categories
 */
export const getCategoriesQuerySchema = Joi.object({
  name: Joi.string()
    .valid(...Object.values(CategoryType))
    .optional(),
  sortBy: Joi.string().valid('name', 'budgetAllocated', 'spentAmount', 'createdAt').optional().default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional().default('ASC'),
});
