import { createHash } from 'crypto';
import { getRedisClient, RedisKeys } from '../../config/redis.config';
import { envConfig } from '../../config/env.config';

const DASHBOARD_TTL = envConfig.CACHE_TTL_DASHBOARD || 60;

const getClient = () => {
  try {
    return getRedisClient();
  } catch (error) {
    return null;
  }
};

const buildKey = (userId: string, suffix: string): string => {
  return `${RedisKeys.dashboard(userId)}:${suffix}`;
};

export const getDashboardCache = async <T>(
  userId: string,
  suffix: string
): Promise<T | null> => {
  const client = getClient();
  if (!client) {
    return null;
  }

  const key = buildKey(userId, suffix);
  const cached = await client.get(key);
  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as T;
  } catch (error) {
    await client.del(key);
    return null;
  }
};

export const setDashboardCache = async (
  userId: string,
  suffix: string,
  payload: any,
  ttlSeconds: number = DASHBOARD_TTL
): Promise<void> => {
  const client = getClient();
  if (!client) {
    return;
  }

  const key = buildKey(userId, suffix);
  await client.set(key, JSON.stringify(payload), {
    EX: ttlSeconds,
  });
};

export const invalidateDashboardCache = async (userId: string): Promise<void> => {
  const client = getClient();
  if (!client) {
    return;
  }

  const pattern = `${RedisKeys.dashboard(userId)}:*`;
  const keysToDelete: string[] = [];

  for await (const key of client.scanIterator({
    MATCH: pattern,
    COUNT: 50,
  })) {
    if (typeof key === 'string') {
      keysToDelete.push(key);
    } else if (key) {
      keysToDelete.push(key.toString());
    }
  }

  if (keysToDelete.length > 0) {
    for (const key of keysToDelete) {
      await client.del(key);
    }
  }
};

export const buildInsightKey = (userId: string, payload: Record<string, any>): string => {
  const hash = createHash('sha1').update(JSON.stringify(payload)).digest('hex');
  return buildKey(userId, `insights:${hash}`);
};
