// // src/config/redis.config.ts
import dotenv from 'dotenv';
dotenv.config();

let redisClient: any = null;

export const initializeRedis = async () => {
  if (redisClient) return redisClient;

  const { createClient } = await import('redis'); // ESM-only package

  const hasUrl = !!process.env.REDIS_URL;
  const client = hasUrl
    ? createClient({ url: process.env.REDIS_URL })
    : createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB || '0', 10),
      });

  client.on('error', (err: any) => console.error('❌ Redis Client Error:', err));
  client.on('connect', () => console.log('✅ Redis connection established'));

  await client.connect();
  redisClient = client;
  return client;
};

export const getRedisClient = () => {
  if (!redisClient) throw new Error('Redis client not initialized. Call initializeRedis() first.');
  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
};

export const RedisKeys = {
  session: (sessionId: string) => `session:${sessionId}`,
  conversation: (sessionId: string) => `conversation:${sessionId}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  budgetCalc: (userId: string, scenario: string) => `budget_calc:${userId}:${scenario}`,
  userProfile: (userId: string) => `user_profile:${userId}`,
};
