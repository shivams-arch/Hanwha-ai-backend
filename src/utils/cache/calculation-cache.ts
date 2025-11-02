import { createHash } from 'crypto';
import { getRedisClient, RedisKeys } from '../../config/redis.config';

const CACHE_TTL_SECONDS = 60 * 5; // 5 minutes

const getClient = () => {
  try {
    return getRedisClient();
  } catch (error) {
    return null;
  }
};

export const buildBudgetCacheKey = (userId: string, suffix: string): string => {
  return RedisKeys.budgetCalc(userId, suffix);
};

export const buildScenarioCacheKey = (userId: string, scenario: string, payload: Record<string, any>): string => {
  const hash = createHash('sha1').update(JSON.stringify(payload)).digest('hex');
  return RedisKeys.budgetCalc(userId, `${scenario}:${hash}`);
};

export const getCalculationCache = async <T>(key: string): Promise<T | null> => {
  const client = getClient();
  if (!client) {
    return null;
  }

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

export const setCalculationCache = async (key: string, value: any, ttlSeconds = CACHE_TTL_SECONDS): Promise<void> => {
  const client = getClient();
  if (!client) {
    return;
  }

  await client.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  });
};

export const invalidateUserCalculations = async (userId: string): Promise<void> => {
  const client = getClient();
  if (!client) {
    return;
  }

  const pattern = `${RedisKeys.budgetCalc(userId, '*')}`;

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
