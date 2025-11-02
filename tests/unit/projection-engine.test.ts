import { ProjectionEngine } from '../../src/utils/calculations/projection-engine';
import { Transaction, TransactionType } from '../../src/models/transaction.entity';

const makeTransaction = (partial: Partial<Transaction>): Transaction =>
  ({
    id: partial.id || 'txn',
    userId: partial.userId || 'user',
    categoryId: partial.categoryId || null,
    amount: partial.amount ?? 0,
    description: partial.description || '',
    type: partial.type || TransactionType.EXPENSE,
    date: partial.date || new Date(),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    user: undefined as any,
    category: undefined as any,
  } as unknown as Transaction);

describe('ProjectionEngine', () => {
  it('generates projections with growth assumptions', () => {
    const transactions = [
      makeTransaction({
        type: TransactionType.INCOME,
        amount: 4000,
        date: new Date('2025-01-15'),
      }),
      makeTransaction({
        type: TransactionType.EXPENSE,
        amount: 2500,
        date: new Date('2025-01-10'),
      }),
      makeTransaction({
        type: TransactionType.INCOME,
        amount: 4200,
        date: new Date('2025-02-15'),
      }),
      makeTransaction({
        type: TransactionType.EXPENSE,
        amount: 2600,
        date: new Date('2025-02-17'),
      }),
    ];

    const result = ProjectionEngine.generate({
      transactions,
      periodMonths: 3,
      incomeGrowthRatePercent: 2,
      expenseGrowthRatePercent: 1,
    });

    expect(result.periodMonths).toBe(3);
    expect(result.monthlyProjections).toHaveLength(3);
    expect(result.averageHistoricalIncome).toBeGreaterThan(4000);
    expect(result.averageHistoricalExpenses).toBeGreaterThan(2500);
    expect(result.monthlyProjections[0].projectedNetCashFlow).toBeCloseTo(
      result.monthlyProjections[0].projectedIncome - result.monthlyProjections[0].projectedExpenses,
      2
    );
  });
});
