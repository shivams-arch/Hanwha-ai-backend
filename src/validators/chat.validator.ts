import Joi from 'joi';

export const chatMessageSchema = Joi.object({
  sessionId: Joi.string().max(255).optional(),
  message: Joi.string().min(1).max(2000).required().messages({
    'string.empty': 'Message cannot be empty',
    'string.max': 'Message cannot exceed 2000 characters',
    'any.required': 'Message is required',
  }),
  metadata: Joi.object().optional(),
});

export const chatHistoryParamsSchema = Joi.object({
  sessionId: Joi.string().max(255).required().messages({
    'string.empty': 'Session ID is required',
    'any.required': 'Session ID is required',
  }),
});

export const chatHistoryQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional().default(20),
});

export const clearSessionParamsSchema = chatHistoryParamsSchema;

export const n8nWebhookSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  sessionId: Joi.string().max(255).required(),
  reply: Joi.string().min(1).required(),
  suggestions: Joi.array().items(Joi.string()).optional(),
  metadata: Joi.object().optional(),
});
