import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;

  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // n8n
  N8N_WEBHOOK_BASE_URL: string;
  N8N_FINANCE_ASSISTANT_WEBHOOK: string;
  N8N_API_KEY?: string;

  // CORS
  CORS_ORIGIN: string[];
  CORS_CREDENTIALS: boolean;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Cache
  CACHE_TTL_DASHBOARD: number;
  CACHE_TTL_CALCULATIONS: number;
  CACHE_TTL_CONVERSATIONS: number;
}

export const envConfig: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  API_VERSION: process.env.API_VERSION || 'v1',

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432'),
  DB_USERNAME: process.env.DB_USERNAME || 'aqua_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'aqua_password',
  DB_DATABASE: process.env.DB_DATABASE || 'aqua_thistle_db',

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_DB: parseInt(process.env.REDIS_DB || '0'),

  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  N8N_WEBHOOK_BASE_URL: process.env.N8N_WEBHOOK_BASE_URL || 'http://localhost:5678',
  N8N_FINANCE_ASSISTANT_WEBHOOK: process.env.N8N_FINANCE_ASSISTANT_WEBHOOK || '/webhook/finance-assistant',
  N8N_API_KEY: process.env.N8N_API_KEY || undefined,

  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(','),
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),

  CACHE_TTL_DASHBOARD: parseInt(process.env.CACHE_TTL_DASHBOARD || '60'),
  CACHE_TTL_CALCULATIONS: parseInt(process.env.CACHE_TTL_CALCULATIONS || '300'),
  CACHE_TTL_CONVERSATIONS: parseInt(process.env.CACHE_TTL_CONVERSATIONS || '3600'),
};

export const isDevelopment = envConfig.NODE_ENV === 'development';
export const isProduction = envConfig.NODE_ENV === 'production';
export const isTest = envConfig.NODE_ENV === 'test';
