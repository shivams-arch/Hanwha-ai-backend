// import { DataSource } from 'typeorm';
// import dotenv from 'dotenv';
// import path from 'path';

// dotenv.config();

// export const AppDataSource = new DataSource({
//   type: 'postgres',
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT || '5432'),
//   username: process.env.DB_USERNAME || 'aqua_user',
//   password: process.env.DB_PASSWORD || 'aqua_password',
//   database: process.env.DB_DATABASE || 'aqua_thistle_db',
//   synchronize: process.env.DB_SYNCHRONIZE === 'true',
//   logging: process.env.DB_LOGGING === 'true',
//   entities: [path.join(__dirname, '../models/**/*.entity{.ts,.js}')],
//   migrations: [path.join(__dirname, '../../db/migrations/**/*{.ts,.js}')],
//   subscribers: [],
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
// });

// export const initializeDatabase = async (): Promise<void> => {
//   try {
//     await AppDataSource.initialize();
//     console.log('✅ Database connection established successfully');
//   } catch (error) {
//     console.error('❌ Error connecting to database:', error);
//     throw error;
//   }
// };
// src/config/database.config.ts
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

// In prod, __dirname === dist/src/config
// In dev,  __dirname === src/config
const entitiesGlob = isProd
  ? path.join(__dirname, '../models/**/*.entity.js')
  : path.join(__dirname, '../models/**/*.entity.ts');

const migrationsGlob = isProd
  ? path.join(__dirname, '../../db/migrations/**/*.js')
  : path.join(__dirname, '../../db/migrations/**/*.ts');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'aqua_user',
  password: process.env.DB_PASSWORD || 'aqua_password',
  database: process.env.DB_DATABASE || 'aqua_thistle_db',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [entitiesGlob],
  migrations: [migrationsGlob],
  subscribers: [],
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    throw error;
  }
};
