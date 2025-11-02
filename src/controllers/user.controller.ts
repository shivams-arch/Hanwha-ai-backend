import { Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * User Controller
 * Handles HTTP requests for user profile endpoints
 */
export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get current user's profile
   * GET /api/v1/users/profile
   */
  getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const profile = await this.userService.getUserProfile(req.user.id);

      res.status(200).json({
        success: true,
        data: { user: profile },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update current user's profile
   * PUT /api/v1/users/profile
   */
  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { name, profileData } = req.body;

      const updatedProfile = await this.userService.updateUserProfile(req.user.id, {
        name,
        profileData,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedProfile },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user by ID (admin endpoint - can be extended with admin auth later)
   * GET /api/v1/users/:id
   */
  getUserById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { id } = req.params;

      const user = await this.userService.getUserById(id);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user (soft delete)
   * DELETE /api/v1/users/:id
   */
  deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const { id } = req.params;

      // For now, users can only delete their own account
      // Can be extended for admin functionality later
      if (id !== req.user.id) {
        res.status(403).json({
          success: false,
          message: 'You can only delete your own account',
        });
        return;
      }

      await this.userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get financial summary
   * GET /api/v1/users/profile/financial-summary
   */
  getFinancialSummary = async (
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

      const summary = await this.userService.getFinancialSummary(req.user.id);

      res.status(200).json({
        success: true,
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update financial data
   * PUT /api/v1/users/profile/financial-data
   */
  updateFinancialData = async (
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

      const { bankAccountBalance, monthlyIncome, monthlyExpenses, fixedExpenses } = req.body;

      const updatedProfile = await this.userService.updateFinancialData(req.user.id, {
        bankAccountBalance,
        monthlyIncome,
        monthlyExpenses,
        fixedExpenses,
      });

      res.status(200).json({
        success: true,
        message: 'Financial data updated successfully',
        data: { user: updatedProfile },
      });
    } catch (error) {
      next(error);
    }
  };
}
