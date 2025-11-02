import { Request, Response, NextFunction } from 'express';
import { envConfig } from '../config/env.config';
import { AuthenticationError } from './error.middleware';

export const verifyN8nSignature = (req: Request, _res: Response, next: NextFunction): void => {
  const headerKey = req.headers['x-api-key'] || req.headers['x-n8n-signature'];
  const apiKey =
    typeof headerKey === 'string'
      ? headerKey
      : Array.isArray(headerKey)
      ? headerKey[0]
      : undefined;

  if (envConfig.N8N_API_KEY && apiKey !== envConfig.N8N_API_KEY) {
    next(new AuthenticationError('Invalid n8n webhook signature'));
    return;
  }

  next();
};
