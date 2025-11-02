import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';
import { seedTestUser } from '../seeds/test-user.seed';

const runSeeds = async () => {
  try {
    console.log('🚀 Starting database seeding...');

    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    await seedTestUser();

    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
    console.log('🎉 Seeding completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

runSeeds();
