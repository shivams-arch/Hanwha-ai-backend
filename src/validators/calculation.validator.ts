import Joi from 'joi';
import { ScenarioType } from '../utils/calculations/scenario-engine';

export const budgetCalculationSchema = Joi.object({
  timeframeDays: Joi.number().integer().min(7).max(180).optional(),
});

const scenarioDataSchemas: Record<ScenarioType, Joi.ObjectSchema> = {
  [ScenarioType.CAN_I_AFFORD]: Joi.object({
    itemCost: Joi.number().positive().required().messages({
      'number.base': 'Item cost must be a number',
      'number.positive': 'Item cost must be greater than zero',
      'any.required': 'Item cost is required',
    }),
    monthsToSave: Joi.number().integer().min(1).max(60).optional(),
    upfrontContribution: Joi.number().min(0).optional(),
    monthlyContribution: Joi.number().min(0).optional(),
  }),
  [ScenarioType.EXPENSE_PROJECTION]: Joi.object({
    currentMonthlyExpense: Joi.number().min(0).required(),
    growthRatePercent: Joi.number().min(0).max(50).optional().default(2),
    periodMonths: Joi.number().integer().min(1).max(120).optional().default(12),
  }),
  [ScenarioType.HOUSING_AFFORDABILITY]: Joi.object({
    housingCost: Joi.number().min(0).required(),
    housingBudgetPercentage: Joi.number().min(5).max(60).optional().default(30),
  }),
  [ScenarioType.DEBT_PAYOFF]: Joi.object({
    currentDebt: Joi.number().min(0).required(),
    interestRatePercent: Joi.number().min(0).max(60).required(),
    monthlyPayment: Joi.number().min(0).required(),
  }),
  [ScenarioType.SAVINGS_GOAL]: Joi.object({
    targetAmount: Joi.number().min(0).required(),
    currentAmount: Joi.number().min(0).optional().default(0),
    monthlyContribution: Joi.number().min(0).optional(),
  }),
};

export const scenarioCalculationSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(ScenarioType))
    .required(),
  data: Joi.object().default({}),
}).custom((value, helpers) => {
  const schema = scenarioDataSchemas[value.type as ScenarioType];
  if (!schema) {
    return helpers.error('any.invalid', { message: `Unsupported scenario type: ${value.type}` });
  }

  const { error, value: parsed } = schema.validate(value.data, { abortEarly: false });
  if (error) {
    return helpers.error('any.invalid', {
      message: error.details.map((detail) => detail.message).join(', '),
    });
  }

  return {
    type: value.type,
    data: parsed,
  };
});

export const projectionQuerySchema = Joi.object({
  periodMonths: Joi.number().integer().min(1).max(120).optional(),
  incomeGrowthRatePercent: Joi.number().min(0).max(20).optional(),
  expenseGrowthRatePercent: Joi.number().min(0).max(30).optional(),
});

export const affordabilitySchema = scenarioDataSchemas[ScenarioType.CAN_I_AFFORD];
