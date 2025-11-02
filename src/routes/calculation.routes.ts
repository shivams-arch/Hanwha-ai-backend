import { Router } from 'express';
import { CalculationController } from '../controllers/calculation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { calculationLimiter } from '../middleware/rate-limit.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  affordabilitySchema,
  budgetCalculationSchema,
  projectionQuerySchema,
  scenarioCalculationSchema,
} from '../validators/calculation.validator';

const router = Router();
const calculationController = new CalculationController();

/**
 * Calculation Routes
 * Base path: /api/v1/calculations
 */

router.post(
  '/budget',
  authenticate,
  calculationLimiter,
  validate(budgetCalculationSchema, 'body'),
  calculationController.calculateBudget
);

router.post(
  '/scenario',
  authenticate,
  calculationLimiter,
  validate(scenarioCalculationSchema, 'body'),
  calculationController.runScenario
);

router.get(
  '/projections',
  authenticate,
  calculationLimiter,
  validate(projectionQuerySchema, 'query'),
  calculationController.getProjections
);

router.post(
  '/affordability',
  authenticate,
  calculationLimiter,
  validate(affordabilitySchema, 'body'),
  calculationController.evaluateAffordability
);

export default router;
