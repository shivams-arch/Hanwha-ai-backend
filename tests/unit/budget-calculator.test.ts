import { BudgetCalculator } from '../../src/utils/calculations/budget-calculator';
import { Category, CategoryType } from '../../src/models/category.entity';
import { Transaction, TransactionType } from '../../src/models/transaction.entity';
import { FinancialGoal, GoalStatus, GoalType } from '../../src/models/financial-goal.entity';

const makeCategory = (partial: Partial<Category>): Category =>
  ({
    id: partial.id || 'cat-1',
    userId: partial.userId || 'user-1',
    name: partial.name || CategoryType.FINANCE,
    budgetAllocated: partial.budgetAllocated ?? 500,
    spentAmount: partial.spentAmount ?? 0,
    description: partial.description ?? null,
    createdAt: partial.createdAt || new Date(),
    updatedAt: partial.updatedAt || new Date(),
    user: undefined as any,
    transactions: [],
  } as Category);

const makeTransaction = (partial: Partial<Transaction>): Transaction =>
  ({
    id: partial.id || 'txn-1',
    userId: partial.userId || 'user-1',
    categoryId: partial.categoryId || 'cat-1',
    amount: partial.amount ?? 100,
    description: partial.description || 'Test',
    type: partial.type || TransactionType.EXPENSE,
    date: partial.date || new Date(),
    metadata: partial.metadata || null,
    createdAt: partial.createdAt || new Date(),
    updatedAt: partial.updatedAt || new Date(),
    user: undefined as any,
    category: undefined as any,
  } as Transaction);

const makeGoal = (partial: Partial<FinancialGoal>): FinancialGoal =>
  ({
    id: partial.id || 'goal-1',
    userId: partial.userId || 'user-1',
    goalType: partial.goalType || GoalType.EMERGENCY_FUND,
    name: partial.name || 'Emergency Fund',
    targetAmount: partial.targetAmount ?? 1000,
    currentAmount: partial.currentAmount ?? 400,
    deadline: partial.deadline || null,
    status: partial.status || GoalStatus.ACTIVE,
    description: partial.description || '',
    createdAt: partial.createdAt || new Date(),
    updatedAt: partial.updatedAt || new Date(),
    user: undefined as any,
  } as FinancialGoal);

describe('BudgetCalculator', () => {
  it('computes budget summary with emergency fund fallback', () => {
    const categories = [
      makeCategory({
        id: 'cat-finance',
        name: CategoryType.FINANCE,
        budgetAllocated: 1000,
        spentAmount: 200,
      }),
      makeCategory({
        id: 'cat-fun',
        name: CategoryType.FRIENDS,
        budgetAllocated: 300,
        spentAmount: 120,
      }),
    ];

    const now = new Date();
    const transactions = [
      makeTransaction({
        id: 'txn-1',
        categoryId: 'cat-finance',
        amount: 200,
        type: TransactionType.EXPENSE,
        date: now,
      }),
      makeTransaction({
        id: 'txn-2',
        categoryId: 'cat-fun',
        amount: 120,
        type: TransactionType.EXPENSE,
        date: now,
      }),
      makeTransaction({
        id: 'txn-3',
        categoryId: null,
        amount: 1000,
        type: TransactionType.INCOME,
        date: now,
      }),
    ];

    const goals = [
      makeGoal({
        goalType: GoalType.EMERGENCY_FUND,
        targetAmount: 2000,
        currentAmount: 600,
      }),
    ];

    const profileData = {
      bankAccountBalance: 2500,
      monthlyIncome: 4600,
      monthlyExpenses: 2800,
      fixedExpenses: {
        rent: 1200,
        utilities: 200,
      },
    };

    const summary = BudgetCalculator.calculate({
      profileData,
      categories,
      transactions,
      goals,
      timeframeDays: 30,
    });

    expect(summary.income.monthly).toBe(4600);
    expect(summary.expenses.fixedMonthly).toBe(1400);
    expect(summary.cashFlow.disposableIncome).toBeCloseTo(
      summary.income.monthly - summary.expenses.reportedMonthly,
      2
    );
    expect(summary.emergencyFund.currentAmount).toBe(600);
    expect(summary.expenses.byCategory).toHaveLength(2);
    expect(summary.expenses.topCategories[0].name).toBe(CategoryType.FINANCE);
  });

  it('falls back to 3-month emergency target when no goal exists', () => {
    const summary = BudgetCalculator.calculate({
      profileData: {
        bankAccountBalance: 1000,
        monthlyIncome: 3000,
        monthlyExpenses: 2000,
        fixedExpenses: {},
      },
      categories: [],
      transactions: [],
      goals: [],
      timeframeDays: 30,
    });

    expect(summary.emergencyFund.targetAmount).toBe(6000); // 3 * 2000
    expect(summary.emergencyFund.completionPercentage).toBeCloseTo((1000 / 6000) * 100, 2);
  });
});
