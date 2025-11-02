import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { envConfig } from '../config/env.config';
import { AuthenticationError } from './error.middleware';
import { getRedisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

/**
 * Extended Request interface with user property
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    iat?: number;
    exp?: number;
  };
}

/**
 * JWT Token Payload Interface
 */
interface JwtPayload {
  id: string;
  email: string;
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, envConfig.JWT_SECRET) as JwtPayload;

    // Check if token is blacklisted (for logout)
    const redisClient = getRedisClient();
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token has expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user if token exists, but doesn't fail if not
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, envConfig.JWT_SECRET) as JwtPayload;

      // Check if token is blacklisted
      const redisClient = getRedisClient();
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (!isBlacklisted) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    // Don't throw error, just log it and continue
    logger.debug('Optional auth failed:', error);
    next();
  }
};

/**
 * Authorization Middleware
 * Ensures user has specific permissions (can be extended later)
 */
export const authorize = (..._roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('You must be logged in'));
      return;
    }

    // Note: Role-based authorization can be implemented when User model includes roles
    // For now, just ensure user is authenticated
    next();
  };
};
