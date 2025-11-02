import { Router } from 'express';
import { CalculationController } from '../controllers/calculation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const calculationController = new CalculationController();

/**
 * Goal Routes
 * Base path: /api/v1/goals
 */

router.get('/progress', authenticate, calculationController.getGoalProgress);

export default router;
