import Joi from 'joi';

export const spendingTrendQuerySchema = Joi.object({
  months: Joi.number().integer().min(1).max(24).optional().default(6),
});
