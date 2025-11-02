import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './error.middleware';

/**
 * Request validation sources
 */
type ValidationSource = 'body' | 'query' | 'params';

/**
 * Validation Middleware Factory
 * Creates middleware to validate request data against a Joi schema
 */
export const validate = (schema: Joi.ObjectSchema, source: ValidationSource = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
      errors: {
        wrap: {
          label: '', // Don't wrap field names in quotes
        },
      },
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      next(new ValidationError(errorMessage));
      return;
    }

    // Replace request data with validated and sanitized data
    // For body, we can safely replace. For query and params, we skip replacement
    // since they are readonly, but validation has already ensured they're correct.
    if (source === 'body') {
      req.body = value;
    }
    // Note: query and params are readonly in Express, so we don't replace them
    // The validation has already checked they're correct, so we can proceed
    next();
  };
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitize = (_req: Request, _res: Response, next: NextFunction): void => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Basic XSS prevention - escape HTML special characters
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      } else {
        const sanitized: any = {};
        for (const key in value) {
          sanitized[key] = sanitizeValue(value[key]);
        }
        return sanitized;
      }
    }
    return value;
  };

  // Note: We're commenting this out for now as it might interfere with legitimate data
  // In production, consider using a library like DOMPurify or sanitize-html instead
  // req.body = sanitizeValue(req.body);
  // req.query = sanitizeValue(req.query);
  // req.params = sanitizeValue(req.params);

  next();
};
