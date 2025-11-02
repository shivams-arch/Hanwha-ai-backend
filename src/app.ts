import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { envConfig } from './config/env.config';
import { initializeDatabase } from './config/database.config';
import { initializeRedis } from './config/redis.config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import apiRoutes from './routes';
import { WebSocketService } from './websockets/socket.service';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = envConfig.PORT;

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use(
  cors({
    origin: envConfig.CORS_ORIGIN,
    credentials: envConfig.CORS_CREDENTIALS,
  })
); // CORS configuration
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // URL-encoded body parser

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: envConfig.NODE_ENV,
    version: envConfig.API_VERSION,
  });
});

// API v1 routes
app.get(`/api/${envConfig.API_VERSION}`, (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'PROJECT AQUA THISTLE API',
    version: envConfig.API_VERSION,
    endpoints: {
      health: '/health',
      api: `/api/${envConfig.API_VERSION}`,
      auth: `/api/${envConfig.API_VERSION}/auth`,
      users: `/api/${envConfig.API_VERSION}/users`,
      categories: `/api/${envConfig.API_VERSION}/categories`,
      transactions: `/api/${envConfig.API_VERSION}/transactions`,
      calculations: `/api/${envConfig.API_VERSION}/calculations`,
      goals: `/api/${envConfig.API_VERSION}/goals`,
      dashboard: `/api/${envConfig.API_VERSION}/dashboard`,
      chat: `/api/${envConfig.API_VERSION}/chat`,
      n8nWebhook: `/api/${envConfig.API_VERSION}/webhooks/n8n/response`,
    },
  });
});

// Mount API routes
app.use(`/api/${envConfig.API_VERSION}`, apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database and Redis, then start server
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('✓ Database connected');

    // Initialize Redis connection
    await initializeRedis();
    logger.info('✓ Redis connected');

    const server = createServer(app);
    const websocketService = WebSocketService.getInstance();
    websocketService.initialize(server);

    // Start Express server
    server.listen(PORT, () => {
      logger.info('\n🚀 SERVER STARTED');
      logger.info('================================');
      logger.info(`Environment: ${envConfig.NODE_ENV}`);
      logger.info(`Port: ${PORT}`);
      logger.info(`API Version: ${envConfig.API_VERSION}`);
      logger.info(`Health Check: http://localhost:${PORT}/health`);
      logger.info(`API Base: http://localhost:${PORT}/api/${envConfig.API_VERSION}`);
      logger.info('WebSockets: enabled (Socket.io)');
      logger.info('================================\n');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

export default app;
