import { Transaction, TransactionType } from '../../models/transaction.entity';

export interface ProjectionInput {
  transactions: Transaction[];
  periodMonths: number;
  incomeGrowthRatePercent?: number;
  expenseGrowthRatePercent?: number;
}

export interface ProjectionPoint {
  monthIndex: number;
  projectedIncome: number;
  projectedExpenses: number;
  projectedNetCashFlow: number;
}

export interface ProjectionResult {
  periodMonths: number;
  averageHistoricalIncome: number;
  averageHistoricalExpenses: number;
  monthlyProjections: ProjectionPoint[];
  assumptions: {
    incomeGrowthRatePercent: number;
    expenseGrowthRatePercent: number;
  };
}

const clampCurrency = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(2));
};

const groupTransactionsByMonth = (transactions: Transaction[]): Map<string, Transaction[]> => {
  const map = new Map<string, Transaction[]>();
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(transaction);
  });
  return map;
};

const calculateMonthlyAverage = (transactions: Transaction[], type: TransactionType): number => {
  if (transactions.length === 0) {
    return 0;
  }

  const grouped = groupTransactionsByMonth(transactions);
  let total = 0;
  let monthCount = 0;

  grouped.forEach((monthlyTransactions) => {
    const monthlySum = monthlyTransactions
      .filter((txn) => txn.type === type)
      .reduce((sum, txn) => sum + Number(txn.amount ?? 0), 0);
    total += monthlySum;
    monthCount += 1;
  });

  if (monthCount === 0) {
    return 0;
  }

  return total / monthCount;
};

export class ProjectionEngine {
  static generate(input: ProjectionInput): ProjectionResult {
    const {
      transactions,
      periodMonths,
      incomeGrowthRatePercent = 1.5,
      expenseGrowthRatePercent = 2,
    } = input;

    const averageIncome = calculateMonthlyAverage(transactions, TransactionType.INCOME);
    const averageExpenses = calculateMonthlyAverage(transactions, TransactionType.EXPENSE);

    const monthlyIncomeGrowth = incomeGrowthRatePercent / 100;
    const monthlyExpenseGrowth = expenseGrowthRatePercent / 100;

    const monthlyProjections: ProjectionPoint[] = [];
    let projectedIncome = averageIncome;
    let projectedExpenses = averageExpenses;

    for (let month = 1; month <= periodMonths; month += 1) {
      if (month > 1) {
        projectedIncome *= 1 + monthlyIncomeGrowth;
        projectedExpenses *= 1 + monthlyExpenseGrowth;
      }

      const netCashFlow = projectedIncome - projectedExpenses;

      monthlyProjections.push({
        monthIndex: month,
        projectedIncome: clampCurrency(projectedIncome),
        projectedExpenses: clampCurrency(projectedExpenses),
        projectedNetCashFlow: clampCurrency(netCashFlow),
      });
    }

    return {
      periodMonths,
      averageHistoricalIncome: clampCurrency(averageIncome),
      averageHistoricalExpenses: clampCurrency(averageExpenses),
      monthlyProjections,
      assumptions: {
        incomeGrowthRatePercent,
        expenseGrowthRatePercent,
      },
    };
  }
}
