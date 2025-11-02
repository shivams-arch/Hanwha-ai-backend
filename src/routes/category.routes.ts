import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  getCategoriesQuerySchema,
} from '../validators/category.validator';

const router = Router();
const categoryController = new CategoryController();

/**
 * Category Routes
 * Base path: /api/v1/categories
 */

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories for current user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validate(getCategoriesQuerySchema, 'query'),
  categoryController.getAllCategories
);

/**
 * @route   POST /api/v1/categories
 * @desc    Create a new category
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createCategorySchema, 'body'),
  categoryController.createCategory
);

/**
 * @route   GET /api/v1/categories/overview
 * @desc    Get aggregated overview data for categories
 * @access  Private
 */
router.get('/overview', authenticate, categoryController.getCategoryOverview);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  validate(categoryIdParamSchema, 'params'),
  categoryController.getCategoryById
);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update a category
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema, 'body'),
  categoryController.updateCategory
);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete a category
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  validate(categoryIdParamSchema, 'params'),
  categoryController.deleteCategory
);

/**
 * @route   GET /api/v1/categories/:id/transactions
 * @desc    Get all transactions for a category
 * @access  Private
 */
router.get(
  '/:id/transactions',
  authenticate,
  validate(categoryIdParamSchema, 'params'),
  categoryController.getCategoryTransactions
);

/**
 * @route   GET /api/v1/categories/:id/summary
 * @desc    Get category spending summary
 * @access  Private
 */
router.get(
  '/:id/summary',
  authenticate,
  validate(categoryIdParamSchema, 'params'),
  categoryController.getCategorySummary
);

export default router;
