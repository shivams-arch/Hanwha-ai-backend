import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar(255) UNIQUE NOT NULL,
        "name" varchar(255) NOT NULL,
        "password" varchar(255) NOT NULL,
        "profileData" jsonb,
        "isActive" boolean DEFAULT true,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    // Create Categories table
    await queryRunner.query(`
      CREATE TYPE "category_type_enum" AS ENUM ('Finance', 'Education', 'Family', 'Friends', 'Weekend Activities/Vacation');

      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "name" category_type_enum NOT NULL,
        "budgetAllocated" decimal(10,2) DEFAULT 0,
        "spentAmount" decimal(10,2) DEFAULT 0,
        "description" text,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create Transactions table
    await queryRunner.query(`
      CREATE TYPE "transaction_type_enum" AS ENUM ('income', 'expense');

      CREATE TABLE "transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "categoryId" uuid,
        "amount" decimal(10,2) NOT NULL,
        "description" varchar(500) NOT NULL,
        "type" transaction_type_enum NOT NULL,
        "date" date NOT NULL,
        "metadata" jsonb,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);

    // Create Financial Goals table
    await queryRunner.query(`
      CREATE TYPE "goal_type_enum" AS ENUM ('Emergency Fund', 'House Down Payment', 'Debt Payoff', 'General Savings', 'Investment', 'Education', 'Vacation', 'Other');
      CREATE TYPE "goal_status_enum" AS ENUM ('active', 'completed', 'paused');

      CREATE TABLE "financial_goals" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "goalType" goal_type_enum NOT NULL,
        "name" varchar(255) NOT NULL,
        "targetAmount" decimal(10,2) NOT NULL,
        "currentAmount" decimal(10,2) DEFAULT 0,
        "deadline" date,
        "status" goal_status_enum DEFAULT 'active',
        "description" text,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create Conversations table
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "sessionId" varchar(255) UNIQUE NOT NULL,
        "messages" jsonb DEFAULT '[]',
        "isActive" boolean DEFAULT true,
        "metadata" jsonb,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`CREATE INDEX "idx_categories_userId" ON "categories"("userId")`);
    await queryRunner.query(`CREATE INDEX "idx_transactions_userId" ON "transactions"("userId")`);
    await queryRunner.query(
      `CREATE INDEX "idx_transactions_categoryId" ON "transactions"("categoryId")`
    );
    await queryRunner.query(`CREATE INDEX "idx_transactions_date" ON "transactions"("date")`);
    await queryRunner.query(`CREATE INDEX "idx_financial_goals_userId" ON "financial_goals"("userId")`);
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_userId" ON "conversations"("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_conversations_sessionId" ON "conversations"("sessionId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "financial_goals"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "goal_status_enum"`);
    await queryRunner.query(`DROP TYPE "goal_type_enum"`);
    await queryRunner.query(`DROP TYPE "transaction_type_enum"`);
    await queryRunner.query(`DROP TYPE "category_type_enum"`);
  }
}
