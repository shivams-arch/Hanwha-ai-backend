import { Category } from '../../models/category.entity';
import { Transaction, TransactionType } from '../../models/transaction.entity';
import { FinancialGoal, GoalType } from '../../models/financial-goal.entity';
import { FinancialProfile } from '../../models/user.entity';

export interface BudgetCalculationInput {
  profileData?: FinancialProfile | null;
  categories: Category[];
  transactions: Transaction[];
  goals: FinancialGoal[];
  timeframeDays: number;
}

export interface CategoryBudgetBreakdown {
  id: string;
  name: string;
  budgetAllocated: number;
  spentAmount: number;
  remainingBudget: number;
  utilization: number;
  lastTransactionDate: Date | null;
}

export interface BudgetSummary {
  income: {
    monthly: number;
    annual: number;
  };
  expenses: {
    reportedMonthly: number;
    fixedMonthly: number;
    variableMonthly: number;
    averageTransaction: number;
    timeframe: string;
    byCategory: CategoryBudgetBreakdown[];
    topCategories: CategoryBudgetBreakdown[];
  };
  cashFlow: {
    disposableIncome: number;
    savingsRate: number;
    projectedAnnualSavings: number;
    runwayMonths: number;
  };
  emergencyFund: {
    targetAmount: number;
    currentAmount: number;
    completionPercentage: number;
    monthsToTarget: number | null;
  };
  metadata: {
    timeframeDays: number;
    transactionsConsidered: number;
    generatedAt: string;
  };
}

const toNumber = (value: any): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumFixedExpenses = (profileData?: FinancialProfile | null): number => {
  if (!profileData?.fixedExpenses) {
    return 0;
  }

  return Object.values(profileData.fixedExpenses).reduce((sum: number, value) => {
    return sum + toNumber(value);
  }, 0);
};

const findEmergencyGoal = (goals: FinancialGoal[]): FinancialGoal | undefined => {
  return goals.find((goal) => goal.goalType === GoalType.EMERGENCY_FUND);
};

export class BudgetCalculator {
  static calculate(input: BudgetCalculationInput): BudgetSummary {
    const { profileData, categories, transactions, goals, timeframeDays } = input;
    const timeframeLabel = `${timeframeDays}d`;
    const timeframeBoundary = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

    const monthlyIncome = toNumber(profileData?.monthlyIncome);
    const reportedMonthlyExpenses = toNumber(profileData?.monthlyExpenses);
    const fixedMonthlyExpenses = sumFixedExpenses(profileData);

    // Filter transactions within timeframe
    const recentTransactions = transactions.filter(
      (transaction) => new Date(transaction.date).getTime() >= timeframeBoundary.getTime()
    );

    const expenseTransactions = recentTransactions.filter(
      (transaction) => transaction.type === TransactionType.EXPENSE
    );

    const totalVariableExpenses = expenseTransactions.reduce((sum, transaction) => {
      return sum + toNumber(transaction.amount);
    }, 0);

    const averageExpenseTransaction =
      expenseTransactions.length > 0 ? totalVariableExpenses / expenseTransactions.length : 0;

    // Estimate monthly variable expenses (scale to 30 days)
    const timeframeMultiplier = timeframeDays > 0 ? 30 / timeframeDays : 1;
    const variableMonthlyEstimate = totalVariableExpenses * timeframeMultiplier;

    // Use maximum between reported expenses and calculated estimate to stay conservative
    const effectiveMonthlyExpenses = Math.max(
      reportedMonthlyExpenses,
      fixedMonthlyExpenses + variableMonthlyEstimate
    );

    const disposableIncome = monthlyIncome - effectiveMonthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (disposableIncome / monthlyIncome) * 100 : 0;
    const projectedAnnualSavings = Math.max(disposableIncome, 0) * 12;

    const bankBalance = toNumber(profileData?.bankAccountBalance);
    const runwayMonths =
      effectiveMonthlyExpenses > 0 ? bankBalance / effectiveMonthlyExpenses : Number.POSITIVE_INFINITY;

    const emergencyGoal = findEmergencyGoal(goals);
    const emergencyTarget =
      emergencyGoal !== undefined
        ? toNumber(emergencyGoal.targetAmount)
        : Math.max(effectiveMonthlyExpenses * 3, 0); // default to 3 months of expenses
    const emergencyCurrent =
      emergencyGoal !== undefined ? toNumber(emergencyGoal.currentAmount) : bankBalance;

    const emergencyCompletion =
      emergencyTarget > 0 ? (emergencyCurrent / emergencyTarget) * 100 : emergencyCurrent > 0 ? 100 : 0;

    const monthlySavings = Math.max(disposableIncome, 0);
    const monthsToTarget =
      monthlySavings > 0 && emergencyTarget > emergencyCurrent
        ? (emergencyTarget - emergencyCurrent) / monthlySavings
        : null;

    const categoryBreakdown = categories.map<CategoryBudgetBreakdown>((category) => {
      const spentAmount = toNumber(category.spentAmount);
      const budgetAllocated = toNumber(category.budgetAllocated);
      const remainingBudget = budgetAllocated - spentAmount;

      const categoryTransactions = transactions.filter(
        (txn) => txn.categoryId === category.id && txn.type === TransactionType.EXPENSE
      );

      let lastTransactionDate: Date | null = null;
      for (const txn of categoryTransactions) {
        const txnDate = new Date(txn.date);
        if (!lastTransactionDate || txnDate.getTime() > lastTransactionDate.getTime()) {
          lastTransactionDate = txnDate;
        }
      }

      return {
        id: category.id,
        name: category.name,
        budgetAllocated,
        spentAmount,
        remainingBudget,
        utilization: budgetAllocated > 0 ? (spentAmount / budgetAllocated) * 100 : 0,
        lastTransactionDate,
      };
    });

    const sortedCategories = [...categoryBreakdown].sort(
      (a, b) => b.spentAmount - a.spentAmount
    );

    return {
      income: {
        monthly: Number(monthlyIncome.toFixed(2)),
        annual: Number((monthlyIncome * 12).toFixed(2)),
      },
      expenses: {
        reportedMonthly: Number(reportedMonthlyExpenses.toFixed(2)),
        fixedMonthly: Number(fixedMonthlyExpenses.toFixed(2)),
        variableMonthly: Number(variableMonthlyEstimate.toFixed(2)),
        averageTransaction: Number(averageExpenseTransaction.toFixed(2)),
        timeframe: timeframeLabel,
        byCategory: categoryBreakdown.map((category) => ({
          ...category,
          budgetAllocated: Number(category.budgetAllocated.toFixed(2)),
          spentAmount: Number(category.spentAmount.toFixed(2)),
          remainingBudget: Number(category.remainingBudget.toFixed(2)),
          utilization: Number(category.utilization.toFixed(2)),
        })),
        topCategories: sortedCategories.slice(0, 3).map((category) => ({
          ...category,
          budgetAllocated: Number(category.budgetAllocated.toFixed(2)),
          spentAmount: Number(category.spentAmount.toFixed(2)),
          remainingBudget: Number(category.remainingBudget.toFixed(2)),
          utilization: Number(category.utilization.toFixed(2)),
        })),
      },
      cashFlow: {
        disposableIncome: Number(disposableIncome.toFixed(2)),
        savingsRate: Number(savingsRate.toFixed(2)),
        projectedAnnualSavings: Number(projectedAnnualSavings.toFixed(2)),
        runwayMonths:
          runwayMonths === Number.POSITIVE_INFINITY ? Infinity : Number(runwayMonths.toFixed(1)),
      },
      emergencyFund: {
        targetAmount: Number(emergencyTarget.toFixed(2)),
        currentAmount: Number(emergencyCurrent.toFixed(2)),
        completionPercentage: Number(emergencyCompletion.toFixed(2)),
        monthsToTarget: monthsToTarget === null ? null : Number(monthsToTarget.toFixed(1)),
      },
      metadata: {
        timeframeDays,
        transactionsConsidered: recentTransactions.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
