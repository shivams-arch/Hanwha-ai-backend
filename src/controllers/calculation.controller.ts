import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  CalculationService,
  ScenarioType,
} from '../services/calculation.service';

export class CalculationController {
  private calculationService: CalculationService;

  constructor() {
    this.calculationService = new CalculationService();
  }

  calculateBudget = async (
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

      const summary = await this.calculationService.getBudgetSummary(req.user.id, {
        timeframeDays: req.body?.timeframeDays,
      });

      res.status(200).json({
        success: true,
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  };

  runScenario = async (
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

      const { type, data } = req.body;

      const result = await this.calculationService.runScenario(
        req.user.id,
        type as ScenarioType,
        data
      );

      res.status(200).json({
        success: true,
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  };

  getProjections = async (
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

      const projections = await this.calculationService.getProjections(req.user.id, {
        periodMonths: req.query?.periodMonths ? Number(req.query.periodMonths) : undefined,
        incomeGrowthRatePercent: req.query?.incomeGrowthRatePercent
          ? Number(req.query.incomeGrowthRatePercent)
          : undefined,
        expenseGrowthRatePercent: req.query?.expenseGrowthRatePercent
          ? Number(req.query.expenseGrowthRatePercent)
          : undefined,
      });

      res.status(200).json({
        success: true,
        data: { projections },
      });
    } catch (error) {
      next(error);
    }
  };

  evaluateAffordability = async (
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

      const result = await this.calculationService.evaluateAffordability(
        req.user.id,
        req.body
      );

      res.status(200).json({
        success: true,
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  };

  getGoalProgress = async (
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

      const progress = await this.calculationService.getGoalProgress(req.user.id);

      res.status(200).json({
        success: true,
        data: { goals: progress },
      });
    } catch (error) {
      next(error);
    }
  };
}
