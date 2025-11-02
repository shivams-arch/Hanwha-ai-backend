import rateLimit from 'express-rate-limit';
import { RateLimitError } from './error.middleware';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw new RateLimitError();
  },
});

/**
 * Strict rate limiter for auth endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (_req, _res) => {
    throw new RateLimitError('Too many authentication attempts, please try again later');
  },
});

/**
 * Rate limiter for chat/AI endpoints
 * 30 requests per minute
 */
export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 messages per minute
  message: 'Too many chat messages, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw new RateLimitError('Too many chat messages, please slow down');
  },
});

/**
 * Rate limiter for calculation endpoints
 * 20 requests per minute
 */
export const calculationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Max 20 calculations per minute
  message: 'Too many calculation requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw new RateLimitError('Too many calculation requests, please slow down');
  },
});
