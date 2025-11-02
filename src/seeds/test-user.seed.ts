import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';
import { User } from '../models/user.entity';
import { Category, CategoryType } from '../models/category.entity';
import {
  FinancialGoal,
  GoalType,
  GoalStatus,
  GoalMetricUnit,
} from '../models/financial-goal.entity';
import { Transaction, TransactionType } from '../models/transaction.entity';
import bcrypt from 'bcrypt';

// Default test user UUID for unauthenticated requests
const TEST_USER_UUID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_PROFILE_DATA = {
  bankAccountBalance: 5250,
  monthlyIncome: 4500,
  monthlyExpenses: 2800,
  fixedExpenses: {
    rent: 1200,
    utilities: 200,
    insurance: 300,
    carPayment: 400,
    studentLoan: 350,
    subscriptions: 150,
    phone: 100,
    internet: 100,
  },
  jobTitle: 'Software Developer',
  employmentStatus: 'Full-time',
} as const;

interface CategorySeed {
  type: CategoryType;
  budget: number;
  description: string;
}

interface TransactionSeed {
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  category?: CategoryType;
  metadata?: Record<string, any>;
}

const buildDefaultProfileData = () => ({
  ...DEFAULT_PROFILE_DATA,
  fixedExpenses: { ...DEFAULT_PROFILE_DATA.fixedExpenses },
});

const toUtcDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const seedTestUser = async () => {
  console.log('🌱 Seeding test user...');

  const userRepository = AppDataSource.getRepository(User);
  const categoryRepository = AppDataSource.getRepository(Category);
  const goalRepository = AppDataSource.getRepository(FinancialGoal);
  const transactionRepository = AppDataSource.getRepository(Transaction);

  let testUser = await userRepository.findOne({
    where: { id: TEST_USER_UUID },
  });

  if (!testUser) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    testUser = userRepository.create({
      id: TEST_USER_UUID,
      email: 'test@aquathistle.com',
      name: 'Alex Johnson',
      password: hashedPassword,
      profileData: buildDefaultProfileData(),
      isActive: true,
    });

    await userRepository.save(testUser);
    console.log('✅ Test user created:', testUser.email);
  } else {
    console.log('⚠️  Test user already exists. Ensuring related seed data...');

    const profileData = testUser.profileData ?? {};
    const defaultProfile = buildDefaultProfileData();
    const mergedProfileData = {
      ...defaultProfile,
      ...profileData,
      fixedExpenses: {
        ...defaultProfile.fixedExpenses,
        ...(profileData.fixedExpenses || {}),
      },
    };

    const needsProfileUpdate =
      profileData.bankAccountBalance === undefined ||
      profileData.monthlyIncome === undefined ||
      profileData.monthlyExpenses === undefined ||
      !profileData.fixedExpenses ||
      Object.keys(DEFAULT_PROFILE_DATA.fixedExpenses).some(
        (key) => profileData.fixedExpenses?.[key] === undefined
      );

    if (needsProfileUpdate) {
      testUser.profileData = mergedProfileData;
      await userRepository.save(testUser);
      console.log('  ✅ Updated test user profile data');
    }
  }

  const categorySeeds: CategorySeed[] = [
    {
      type: CategoryType.FINANCE,
      budget: 12000,
      description: 'Financial obligations, housing, insurance, and debt payments',
    },
    {
      type: CategoryType.EDUCATION,
      budget: 400,
      description: 'Courses, certifications, and learning resources',
    },
    {
      type: CategoryType.FAMILY,
      budget: 2400,
      description: 'Groceries and household expenses that support family life',
    },
    {
      type: CategoryType.FRIENDS,
      budget: 600,
      description: 'Social outings and shared experiences with friends',
    },
    {
      type: CategoryType.VACATION,
      budget: 800,
      description: 'Weekend getaways and travel experiences',
    },
  ];

  const categoryMap = new Map<CategoryType, Category>();

  for (const seed of categorySeeds) {
    const existingCategory = await categoryRepository.findOne({
      where: {
        userId: testUser.id,
        name: seed.type,
      },
    });

    if (existingCategory) {
      let needsUpdate = false;
      const currentBudget = Number(existingCategory.budgetAllocated);

      if (Math.abs(currentBudget - seed.budget) > 0.01) {
        existingCategory.budgetAllocated = seed.budget;
        needsUpdate = true;
      }

      if (!existingCategory.description) {
        existingCategory.description = seed.description;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await categoryRepository.save(existingCategory);
        console.log(`  ✅ Updated category: ${seed.type}`);
      } else {
        console.log(`  ⚠️  Category already configured: ${seed.type}`);
      }

      categoryMap.set(seed.type, existingCategory);
    } else {
      const category = categoryRepository.create({
        userId: testUser.id,
        name: seed.type,
        budgetAllocated: seed.budget,
        spentAmount: 0,
        description: seed.description,
      });

      const savedCategory = await categoryRepository.save(category);
      categoryMap.set(seed.type, savedCategory);
      console.log(`  ✅ Created category: ${seed.type}`);
    }
  }

  console.log('✅ Default categories processed for test user');

  const goals = [
    {
      userId: testUser.id,
      goalType: GoalType.EMERGENCY_FUND,
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentAmount: 5250,
      status: GoalStatus.ACTIVE,
      description: 'Build emergency fund covering at least 3 months of expenses',
      deadline: new Date('2025-12-31T00:00:00.000Z'),
      metricUnit: GoalMetricUnit.CURRENCY,
      metadata: null,
    },
    {
      userId: testUser.id,
      goalType: GoalType.HOUSE_DOWN_PAYMENT,
      name: 'House Down Payment',
      targetAmount: 50000,
      currentAmount: 7500,
      status: GoalStatus.ACTIVE,
      description: 'Save for a future home purchase',
      deadline: new Date('2027-06-30T00:00:00.000Z'),
      metricUnit: GoalMetricUnit.CURRENCY,
      metadata: null,
    },
    {
      userId: testUser.id,
      goalType: GoalType.DEBT_PAYOFF,
      name: 'Pay Off Student Loans',
      targetAmount: 25000,
      currentAmount: 8400,
      status: GoalStatus.ACTIVE,
      description: 'Aggressively pay down remaining student loans',
      deadline: new Date('2026-04-30T00:00:00.000Z'),
      metricUnit: GoalMetricUnit.CURRENCY,
      metadata: null,
    },
    {
      userId: testUser.id,
      goalType: GoalType.EDUCATION,
      name: 'AWS Solutions Architect Exam',
      targetAmount: 120,
      currentAmount: 36,
      status: GoalStatus.ACTIVE,
      description: 'Crack the AWS SAA-C03 exam with a structured 12-week study plan',
      deadline: new Date('2025-07-15T00:00:00.000Z'),
      metricUnit: GoalMetricUnit.HOURS,
      metadata: {
        examName: 'AWS Certified Solutions Architect – Associate (SAA-C03)',
        examDate: '2025-07-15',
        targetScore: 750,
        currentMockScore: 640,
        studyPlan: {
          totalHours: 120,
          completedHours: 36,
          weeklyTargetHours: 8,
          upcomingFocusAreas: ['Well-Architected Framework', 'Security Best Practices'],
        },
        milestones: [
          {
            title: 'Finish core services deep dive',
            dueDate: '2025-04-15',
          },
          {
            title: 'Complete practice exam #1',
            dueDate: '2025-05-05',
          },
          {
            title: 'Book final exam slot',
            dueDate: '2025-06-15',
          },
        ],
        nextAction: 'Watch Security best-practices module and take notes',
        resourceLinks: [
          {
            label: 'Exam Guide (AWS)',
            url: 'https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS_Certified_Solutions_Architect_Associate-Exam_Guide.pdf',
          },
          {
            label: 'Stephane Maarek Udemy Course',
            url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/',
          },
        ],
      },
    },
  ];

  for (const goalData of goals) {
    const existingGoal = await goalRepository.findOne({
      where: {
        userId: testUser.id,
        goalType: goalData.goalType,
      },
    });

    if (!existingGoal) {
      const goal = goalRepository.create(goalData);
      await goalRepository.save(goal);
      console.log(`  ✅ Created goal: ${goalData.name}`);
    } else {
      let needsUpdate = false;
      const currentAmount = Number(existingGoal.currentAmount);
      const targetAmount = Number(existingGoal.targetAmount);

      if (Math.abs(targetAmount - goalData.targetAmount) > 0.01) {
        existingGoal.targetAmount = goalData.targetAmount;
        needsUpdate = true;
      }

      if (Math.abs(currentAmount - goalData.currentAmount) > 0.01) {
        existingGoal.currentAmount = goalData.currentAmount;
        needsUpdate = true;
      }

      if (!existingGoal.description) {
        existingGoal.description = goalData.description;
        needsUpdate = true;
      }

      if (!existingGoal.deadline && goalData.deadline) {
        existingGoal.deadline = goalData.deadline;
        needsUpdate = true;
      }

      if (existingGoal.status !== goalData.status) {
        existingGoal.status = goalData.status;
        needsUpdate = true;
      }

      if (existingGoal.metricUnit !== goalData.metricUnit) {
        existingGoal.metricUnit = goalData.metricUnit;
        needsUpdate = true;
      }

      const metadataChanged =
        JSON.stringify(existingGoal.metadata ?? null) !== JSON.stringify(goalData.metadata ?? null);
      if (metadataChanged) {
        existingGoal.metadata = goalData.metadata ?? null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await goalRepository.save(existingGoal);
        console.log(`  ✅ Updated goal: ${goalData.name}`);
      } else {
        console.log(`  ⚠️  Goal already configured: ${goalData.name}`);
      }
    }
  }

  console.log('✅ Financial goals processed for test user');

  const transactionSeeds: TransactionSeed[] = [
    { description: 'Monthly Salary', amount: 4500, type: TransactionType.INCOME, date: '2025-02-01' },
    { description: 'Freelance Project Income', amount: 650, type: TransactionType.INCOME, date: '2025-02-18' },
    { description: 'Rent Payment', amount: 1200, type: TransactionType.EXPENSE, date: '2025-02-02', category: CategoryType.FINANCE },
    { description: 'Insurance Premium', amount: 250, type: TransactionType.EXPENSE, date: '2025-02-05', category: CategoryType.FINANCE },
    { description: 'Student Loan Payment', amount: 350, type: TransactionType.EXPENSE, date: '2025-02-08', category: CategoryType.FINANCE },
    { description: 'Groceries - Fresh Market', amount: 385, type: TransactionType.EXPENSE, date: '2025-02-10', category: CategoryType.FAMILY },
    { description: 'Online Course Subscription', amount: 49, type: TransactionType.EXPENSE, date: '2025-02-12', category: CategoryType.EDUCATION },
    { description: 'Dinner with Friends', amount: 92, type: TransactionType.EXPENSE, date: '2025-02-14', category: CategoryType.FRIENDS },
    { description: 'Weekend Getaway', amount: 140, type: TransactionType.EXPENSE, date: '2025-02-21', category: CategoryType.VACATION },

    { description: 'Monthly Salary', amount: 4500, type: TransactionType.INCOME, date: '2025-01-01' },
    { description: 'Freelance Project Income', amount: 520, type: TransactionType.INCOME, date: '2025-01-20' },
    { description: 'Rent Payment', amount: 1200, type: TransactionType.EXPENSE, date: '2025-01-02', category: CategoryType.FINANCE },
    { description: 'Insurance Premium', amount: 245, type: TransactionType.EXPENSE, date: '2025-01-05', category: CategoryType.FINANCE },
    { description: 'Student Loan Payment', amount: 350, type: TransactionType.EXPENSE, date: '2025-01-08', category: CategoryType.FINANCE },
    { description: 'Groceries - Fresh Market', amount: 370, type: TransactionType.EXPENSE, date: '2025-01-10', category: CategoryType.FAMILY },
    { description: 'Certification Course Fee', amount: 49, type: TransactionType.EXPENSE, date: '2025-01-12', category: CategoryType.EDUCATION },
    { description: 'Coffee with Friends', amount: 85, type: TransactionType.EXPENSE, date: '2025-01-16', category: CategoryType.FRIENDS },
    { description: 'Ski Weekend Trip', amount: 160, type: TransactionType.EXPENSE, date: '2025-01-25', category: CategoryType.VACATION },

    { description: 'Monthly Salary', amount: 4500, type: TransactionType.INCOME, date: '2024-12-01' },
    { description: 'Freelance Project Income', amount: 600, type: TransactionType.INCOME, date: '2024-12-18' },
    { description: 'Rent Payment', amount: 1200, type: TransactionType.EXPENSE, date: '2024-12-02', category: CategoryType.FINANCE },
    { description: 'Insurance Premium', amount: 240, type: TransactionType.EXPENSE, date: '2024-12-05', category: CategoryType.FINANCE },
    { description: 'Student Loan Payment', amount: 350, type: TransactionType.EXPENSE, date: '2024-12-08', category: CategoryType.FINANCE },
    { description: 'Holiday Groceries', amount: 360, type: TransactionType.EXPENSE, date: '2024-12-10', category: CategoryType.FAMILY },
    { description: 'Design Workshop', amount: 49, type: TransactionType.EXPENSE, date: '2024-12-12', category: CategoryType.EDUCATION },
    { description: 'Friends Holiday Dinner', amount: 110, type: TransactionType.EXPENSE, date: '2024-12-15', category: CategoryType.FRIENDS },
    { description: 'Holiday Getaway', amount: 220, type: TransactionType.EXPENSE, date: '2024-12-27', category: CategoryType.VACATION },

    { description: 'Monthly Salary', amount: 4500, type: TransactionType.INCOME, date: '2024-11-01' },
    { description: 'Freelance Project Income', amount: 450, type: TransactionType.INCOME, date: '2024-11-19' },
    { description: 'Rent Payment', amount: 1200, type: TransactionType.EXPENSE, date: '2024-11-02', category: CategoryType.FINANCE },
    { description: 'Insurance Premium', amount: 240, type: TransactionType.EXPENSE, date: '2024-11-05', category: CategoryType.FINANCE },
    { description: 'Student Loan Payment', amount: 350, type: TransactionType.EXPENSE, date: '2024-11-08', category: CategoryType.FINANCE },
    { description: 'Groceries - Farmers Market', amount: 355, type: TransactionType.EXPENSE, date: '2024-11-10', category: CategoryType.FAMILY },
    { description: 'UX Webinar', amount: 45, type: TransactionType.EXPENSE, date: '2024-11-12', category: CategoryType.EDUCATION },
    { description: 'Friendsgiving Potluck', amount: 95, type: TransactionType.EXPENSE, date: '2024-11-17', category: CategoryType.FRIENDS },

    { description: 'Monthly Salary', amount: 4500, type: TransactionType.INCOME, date: '2024-10-01' },
    { description: 'Freelance Project Income', amount: 400, type: TransactionType.INCOME, date: '2024-10-20' },
    { description: 'Rent Payment', amount: 1200, type: TransactionType.EXPENSE, date: '2024-10-02', category: CategoryType.FINANCE },
    { description: 'Insurance Premium', amount: 240, type: TransactionType.EXPENSE, date: '2024-10-05', category: CategoryType.FINANCE },
    { description: 'Student Loan Payment', amount: 350, type: TransactionType.EXPENSE, date: '2024-10-08', category: CategoryType.FINANCE },
    { description: 'Groceries - Fresh Market', amount: 345, type: TransactionType.EXPENSE, date: '2024-10-10', category: CategoryType.FAMILY },
    { description: 'Product Design Course', amount: 45, type: TransactionType.EXPENSE, date: '2024-10-12', category: CategoryType.EDUCATION },
    { description: 'Game Night with Friends', amount: 88, type: TransactionType.EXPENSE, date: '2024-10-16', category: CategoryType.FRIENDS },
    { description: 'Autumn Hiking Trip', amount: 90, type: TransactionType.EXPENSE, date: '2024-10-26', category: CategoryType.VACATION },

    { description: 'Monthly Salary', amount: 4500, type: TransactionType.INCOME, date: '2024-09-01' },
    { description: 'Freelance Project Income', amount: 550, type: TransactionType.INCOME, date: '2024-09-18' },
    { description: 'Rent Payment', amount: 1200, type: TransactionType.EXPENSE, date: '2024-09-02', category: CategoryType.FINANCE },
    { description: 'Insurance Premium', amount: 240, type: TransactionType.EXPENSE, date: '2024-09-05', category: CategoryType.FINANCE },
    { description: 'Student Loan Payment', amount: 350, type: TransactionType.EXPENSE, date: '2024-09-08', category: CategoryType.FINANCE },
    { description: 'Groceries - Fresh Market', amount: 330, type: TransactionType.EXPENSE, date: '2024-09-10', category: CategoryType.FAMILY },
    { description: 'Online Learning Platform', amount: 45, type: TransactionType.EXPENSE, date: '2024-09-12', category: CategoryType.EDUCATION },
    { description: 'Brunch with Friends', amount: 80, type: TransactionType.EXPENSE, date: '2024-09-15', category: CategoryType.FRIENDS },
    { description: 'Beach Day Trip', amount: 120, type: TransactionType.EXPENSE, date: '2024-09-22', category: CategoryType.VACATION },
  ];

  const transactionsToInsert: Transaction[] = [];

  for (const seed of transactionSeeds) {
    const existingTransaction = await transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId: testUser.id })
      .andWhere('transaction.description = :description', { description: seed.description })
      .andWhere('transaction.date = :date', { date: seed.date })
      .getOne();

    if (existingTransaction) {
      continue;
    }

    let categoryId: string | null = null;
    if (seed.category) {
      const category = categoryMap.get(seed.category);
      if (!category) {
        console.warn(
          `  ⚠️  Skipping transaction "${seed.description}" — missing category ${seed.category}`
        );
        continue;
      }
      categoryId = category.id;
    }

    const transaction = transactionRepository.create({
      userId: testUser.id,
      categoryId,
      amount: seed.amount,
      description: seed.description,
      type: seed.type,
      date: toUtcDate(seed.date),
      metadata: seed.metadata ?? null,
    });

    transactionsToInsert.push(transaction);
  }

  if (transactionsToInsert.length > 0) {
    await transactionRepository.save(transactionsToInsert);
    console.log(`✅ Created ${transactionsToInsert.length} transactions for financial history`);
  } else {
    console.log('⚠️  Transactions already seeded for test user');
  }

  const spendingRows = await transactionRepository
    .createQueryBuilder('transaction')
    .select('transaction.categoryId', 'categoryId')
    .addSelect('SUM(transaction.amount)', 'totalSpent')
    .where('transaction.userId = :userId', { userId: testUser.id })
    .andWhere('transaction.type = :type', { type: TransactionType.EXPENSE })
    .andWhere('transaction.categoryId IS NOT NULL')
    .groupBy('transaction.categoryId')
    .getRawMany<{ categoryId: string; totalSpent: string }>();

  const categoriesToUpdate: Category[] = [];

  for (const category of categoryMap.values()) {
    const spentRow = spendingRows.find((row) => row.categoryId === category.id);
    const normalizedSpent = spentRow ? Number(Number(spentRow.totalSpent).toFixed(2)) : 0;
    const currentStoredSpent = Number(category.spentAmount);

    if (Math.abs(currentStoredSpent - normalizedSpent) > 0.01) {
      category.spentAmount = normalizedSpent;
      categoriesToUpdate.push(category);
    }
  }

  if (categoriesToUpdate.length > 0) {
    await categoryRepository.save(categoriesToUpdate);
    console.log('✅ Category spending totals synchronized with transactions');
  }

  return testUser;
};
