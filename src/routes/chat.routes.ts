import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
// TODO: Re-enable authentication import when needed
// import { authenticate } from '../middleware/auth.middleware';
import { chatLimiter } from '../middleware/rate-limit.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  chatMessageSchema,
  chatHistoryParamsSchema,
  chatHistoryQuerySchema,
  clearSessionParamsSchema,
} from '../validators/chat.validator';

const router = Router();
const chatController = new ChatController();

/**
 * Chat Routes
 * Base path: /api/v1/chat
 */

// TODO: Re-enable authentication after development
router.post(
  '/session',
  // authenticate,  // Bypassed for development
  chatController.createSession
);

router.post(
  '/message',
  // authenticate,  // Bypassed for development
  chatLimiter,
  validate(chatMessageSchema, 'body'),
  chatController.sendMessage
);

router.get(
  '/history/:sessionId',
  // authenticate,  // Bypassed for development
  validate(chatHistoryParamsSchema, 'params'),
  validate(chatHistoryQuerySchema, 'query'),
  chatController.getHistory
);

router.delete(
  '/session/:sessionId',
  // authenticate,  // Bypassed for development
  validate(clearSessionParamsSchema, 'params'),
  chatController.clearSession
);

export default router;
