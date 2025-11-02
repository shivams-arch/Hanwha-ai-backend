import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { spendingTrendQuerySchema } from '../validators/dashboard.validator';

const router = Router();
const dashboardController = new DashboardController();

/**
 * Dashboard Routes
 * Base path: /api/v1/dashboard
 */

router.get('/overview', authenticate, dashboardController.getOverview);
router.get('/charts/budget-breakdown', authenticate, dashboardController.getBudgetBreakdown);
router.get(
  '/charts/spending-trends',
  authenticate,
  validate(spendingTrendQuerySchema, 'query'),
  dashboardController.getSpendingTrends
);
router.get(
  '/charts/category-comparison',
  authenticate,
  dashboardController.getCategoryComparison
);
router.get('/insights', authenticate, dashboardController.getInsights);

export default router;
