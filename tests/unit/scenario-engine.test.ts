import {
  ScenarioEngine,
  ScenarioType,
} from '../../src/utils/calculations/scenario-engine';
import type { ScenarioContext } from '../../src/utils/calculations/scenario-engine';

const baseContext: ScenarioContext = {
  profileData: {
    bankAccountBalance: 2000,
    monthlyIncome: 4500,
    monthlyExpenses: 2600,
    fixedExpenses: {},
  },
  monthlyIncome: 4500,
  monthlyExpenses: 2600,
  disposableIncome: 1900,
  bankBalance: 2000,
};

describe('ScenarioEngine', () => {
  it('evaluates affordability scenario', () => {
    const result = ScenarioEngine.evaluate({
      type: ScenarioType.CAN_I_AFFORD,
      data: {
        itemCost: 3000,
        monthsToSave: 3,
        upfrontContribution: 500,
      },
      context: baseContext,
    });

    expect(result.type).toBe(ScenarioType.CAN_I_AFFORD);
    expect(result.details.canAffordWithinTimeframe).toBe(true);
    expect(result.details.monthsNeeded).toBeCloseTo(0.3, 1);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  it('evaluates debt payoff scenario with insufficient payment', () => {
    const result = ScenarioEngine.evaluate({
      type: ScenarioType.DEBT_PAYOFF,
      data: {
        currentDebt: 5000,
        interestRatePercent: 12,
        monthlyPayment: 20,
      },
      context: baseContext,
    });

    expect(result.details.monthsToPayoff).toBeNull();
    expect(result.recommendations[0]).toMatch(/Increase monthly payments/);
  });

  it('evaluates savings goal scenario', () => {
    const result = ScenarioEngine.evaluate({
      type: ScenarioType.SAVINGS_GOAL,
      data: {
        targetAmount: 10000,
        currentAmount: 2500,
        monthlyContribution: 500,
      },
      context: baseContext,
    });

    expect(result.details.monthsToGoal).toBeCloseTo(15, 0);
    expect(result.details.completionPercentage).toBe(25);
    expect(result.recommendations).toHaveLength(1);
  });
});
