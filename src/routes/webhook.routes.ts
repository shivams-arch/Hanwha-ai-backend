import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { verifyN8nSignature } from '../middleware/n8n.middleware';
import { validate } from '../middleware/validation.middleware';
import { n8nWebhookSchema } from '../validators/chat.validator';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const chatController = new ChatController();

/**
 * Webhook Routes
 * Base path: /api/v1/webhooks
 */

router.post(
  '/n8n/response',
  verifyN8nSignature,
  validate(n8nWebhookSchema, 'body'),
  asyncHandler(chatController.handleN8nResponse)
);

export default router;
