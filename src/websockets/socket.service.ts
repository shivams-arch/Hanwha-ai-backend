import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { envConfig } from '../config/env.config';
import { logger } from '../utils/logger';

interface SocketAuthPayload {
  userId?: string;
}

/**
 * Singleton Socket.io wrapper that broadcasts per-user dashboard/chat events.
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(server: HttpServer): void {
    if (this.io) {
      return;
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: envConfig.CORS_ORIGIN,
        credentials: envConfig.CORS_CREDENTIALS,
      },
    });

    this.io.on('connection', (socket: Socket) => {
      const auth = socket.handshake.auth as SocketAuthPayload;
      const userId = auth?.userId || (socket.handshake.query.userId as string | undefined);

      if (userId) {
        socket.join(userId);
        logger.info('Socket connected', { userId, socketId: socket.id });

        socket.emit('connection:ack', {
          message: 'Connected to Finny Live Updates',
        });
      } else {
        logger.warn('Socket connection missing userId, disconnecting', { socketId: socket.id });
        socket.disconnect();
      }

      socket.on('disconnect', (reason) => {
        logger.info('Socket disconnected', { socketId: socket.id, reason });
      });
    });

    logger.info('WebSocket service initialized');
  }

  emitToUser(userId: string, event: string, payload: any): void {
    if (!this.io) {
      return;
    }
    this.io.to(userId).emit(event, payload);
  }

  broadcast(event: string, payload: any): void {
    if (!this.io) {
      return;
    }
    this.io.emit(event, payload);
  }
}
