import { Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Category Controller
 * Handles HTTP requests for category endpoints
 */
export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * Get aggregated overview data for categories
   * GET /api/v1/categories/overview
   */
  getCategoryOverview = async (
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

      const overview = await this.categoryService.getCategoriesOverview(req.user.id);

      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all categories for current user
   * GET /api/v1/categories
   */
  getAllCategories = async (
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

      const { name, sortBy, sortOrder } = req.query;

      const categories = await this.categoryService.getAllCategories(req.user.id, {
        name: name as any,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      });

      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category by ID
   * GET /api/v1/categories/:id
   */
  getCategoryById = async (
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

      const category = await this.categoryService.getCategoryById(id, req.user.id);

      res.status(200).json({
        success: true,
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new category
   * POST /api/v1/categories
   */
  createCategory = async (
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

      const { name, budgetAllocated, description } = req.body;

      const category = await this.categoryService.createCategory(req.user.id, {
        name,
        budgetAllocated,
        description,
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a category
   * PUT /api/v1/categories/:id
   */
  updateCategory = async (
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
      const { name, budgetAllocated, spentAmount, description } = req.body;

      const category = await this.categoryService.updateCategory(id, req.user.id, {
        name,
        budgetAllocated,
        spentAmount,
        description,
      });

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a category
   * DELETE /api/v1/categories/:id
   */
  deleteCategory = async (
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

      await this.categoryService.deleteCategory(id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category transactions
   * GET /api/v1/categories/:id/transactions
   */
  getCategoryTransactions = async (
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

      const transactions = await this.categoryService.getCategoryTransactions(
        id,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: { transactions },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category spending summary
   * GET /api/v1/categories/:id/summary
   */
  getCategorySummary = async (
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

      const summary = await this.categoryService.getCategorySummary(id, req.user.id);

      res.status(200).json({
        success: true,
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  };
}
