import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  updateProfileSchema,
  updateFinancialDataSchema,
  userIdParamSchema,
} from '../validators/user.validator';

const router = Router();
const userController = new UserController();

/**
 * User Profile Routes
 * Base path: /api/v1/users
 */

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema, 'body'),
  userController.updateProfile
);

/**
 * @route   GET /api/v1/users/profile/financial-summary
 * @desc    Get financial summary for current user
 * @access  Private
 */
router.get('/profile/financial-summary', authenticate, userController.getFinancialSummary);

/**
 * @route   PUT /api/v1/users/profile/financial-data
 * @desc    Update financial data for current user
 * @access  Private
 */
router.put(
  '/profile/financial-data',
  authenticate,
  validate(updateFinancialDataSchema, 'body'),
  userController.updateFinancialData
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (admin or own profile)
 * @access  Private
 */
router.get('/:id', authenticate, validate(userIdParamSchema, 'params'), userController.getUserById);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete - own account only)
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  validate(userIdParamSchema, 'params'),
  userController.deleteUser
);

export default router;
