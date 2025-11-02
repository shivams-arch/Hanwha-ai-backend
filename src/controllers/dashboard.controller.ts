import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getOverview = async (
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

      const overview = await this.dashboardService.getOverview(req.user.id);

      res.status(200).json({
        success: true,
        data: { overview },
      });
    } catch (error) {
      next(error);
    }
  };

  getBudgetBreakdown = async (
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

      const breakdown = await this.dashboardService.getBudgetBreakdown(req.user.id);

      res.status(200).json({
        success: true,
        data: { breakdown },
      });
    } catch (error) {
      next(error);
    }
  };

  getSpendingTrends = async (
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

      const months = req.query.months ? Number(req.query.months) : 6;
      const trends = await this.dashboardService.getSpendingTrends(req.user.id, months);

      res.status(200).json({
        success: true,
        data: { trends },
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryComparison = async (
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

      const data = await this.dashboardService.getCategoryComparison(req.user.id);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getInsights = async (
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

      const insights = await this.dashboardService.getInsights(req.user.id);

      res.status(200).json({
        success: true,
        data: { insights },
      });
    } catch (error) {
      next(error);
    }
  };
}
