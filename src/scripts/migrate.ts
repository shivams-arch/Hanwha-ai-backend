import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';

const runMigrations = async () => {
  try {
    console.log('🚀 Starting database migrations...');

    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const migrations = await AppDataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('✅ No pending migrations to run');
    } else {
      console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration.name}`);
      });
    }

    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
