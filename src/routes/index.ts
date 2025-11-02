import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import categoryRoutes from './category.routes';
import transactionRoutes from './transaction.routes';
import calculationRoutes from './calculation.routes';
import goalRoutes from './goal.routes';
import chatRoutes from './chat.routes';
import webhookRoutes from './webhook.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

/**
 * API Routes
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/calculations', calculationRoutes);
router.use('/goals', goalRoutes);
router.use('/chat', chatRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
