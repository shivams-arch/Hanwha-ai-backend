import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: any = null;

export const initializeRedis = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient;
  }

  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '0'),
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('✅ Redis connection established');
  });

  await client.connect();
  redisClient = client as any;

  return client as any;
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
};

// Redis key structure helpers
export const RedisKeys = {
  session: (sessionId: string) => `session:${sessionId}`,
  conversation: (sessionId: string) => `conversation:${sessionId}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  budgetCalc: (userId: string, scenario: string) => `budget_calc:${userId}:${scenario}`,
  userProfile: (userId: string) => `user_profile:${userId}`,
};
