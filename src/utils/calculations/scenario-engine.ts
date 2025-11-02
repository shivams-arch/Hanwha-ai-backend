import { FinancialProfile } from '../../models/user.entity';

export enum ScenarioType {
  CAN_I_AFFORD = 'can_i_afford',
  EXPENSE_PROJECTION = 'expense_projection',
  HOUSING_AFFORDABILITY = 'housing_affordability',
  DEBT_PAYOFF = 'debt_payoff',
  SAVINGS_GOAL = 'savings_goal',
}

export interface ScenarioContext {
  profileData?: FinancialProfile | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  disposableIncome: number;
  bankBalance: number;
}

export interface ScenarioInput {
  type: ScenarioType;
  data: Record<string, any>;
  context: ScenarioContext;
}

export interface ScenarioResult {
  type: ScenarioType;
  summary: string;
  details: Record<string, any>;
  recommendations: string[];
}

const clampNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(2));
};

const roundMonths = (value: number): number | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Number(value.toFixed(1)));
};

const evaluateCanIAfford = (input: ScenarioInput): ScenarioResult => {
  const { data, context } = input;
  const itemCost = Number(data.itemCost ?? 0);
  const monthsToSave = Number(data.monthsToSave ?? 6);
  const upfrontContribution = Number(data.upfrontContribution ?? 0);
  const monthlyContribution =
    data.monthlyContribution !== undefined
      ? Number(data.monthlyContribution)
      : Math.max(context.disposableIncome, 0);

  const remainingCost = Math.max(itemCost - (context.bankBalance + upfrontContribution), 0);
  const monthsNeeded =
    monthlyContribution > 0 ? remainingCost / monthlyContribution : Infinity;
  const canAffordWithinTimeframe = monthsNeeded <= monthsToSave;

  const summary = canAffordWithinTimeframe
    ? `You can afford this purchase in approximately ${Math.ceil(monthsNeeded)} month(s) with your current savings plan.`
    : `At your current savings rate it will take about ${Math.ceil(monthsNeeded)} month(s) to afford this purchase.`;

  const recommendations: string[] = [];
  if (!canAffordWithinTimeframe) {
    recommendations.push('Increase monthly contributions or extend your savings timeline.');
  }
  if (context.disposableIncome < 0) {
    recommendations.push('Focus on reducing expenses first so you are not going further into debt.');
  }

  return {
    type: ScenarioType.CAN_I_AFFORD,
    summary,
    details: {
      itemCost: clampNumber(itemCost),
      upfrontContribution: clampNumber(upfrontContribution),
      remainingCost: clampNumber(remainingCost),
      monthlyContribution: clampNumber(monthlyContribution),
      monthsNeeded: roundMonths(monthsNeeded),
      targetMonths: clampNumber(monthsToSave),
      canAffordWithinTimeframe,
    },
    recommendations,
  };
};

const evaluateExpenseProjection = (input: ScenarioInput): ScenarioResult => {
  const { data } = input;
  const startingExpense = Number(data.currentMonthlyExpense ?? 0);
  const growthRatePercent = Number(data.growthRatePercent ?? 0);
  const periodMonths = Number(data.periodMonths ?? 12);

  const growthRate = growthRatePercent / 100;
  const projections: Array<{ month: number; projectedExpense: number }> = [];
  let currentExpense = startingExpense;

  for (let month = 1; month <= periodMonths; month += 1) {
    currentExpense = currentExpense * (1 + growthRate);
    projections.push({
      month,
      projectedExpense: clampNumber(currentExpense),
    });
  }

  const finalExpense = projections.length > 0 ? projections[projections.length - 1].projectedExpense : 0;
  const summary = `Your expense could grow from $${clampNumber(startingExpense)} to ~$${finalExpense} over ${periodMonths} month(s) with a ${growthRatePercent}% growth rate.`;

  return {
    type: ScenarioType.EXPENSE_PROJECTION,
    summary,
    details: {
      startingExpense: clampNumber(startingExpense),
      growthRatePercent: clampNumber(growthRatePercent),
      periodMonths,
      projections,
    },
    recommendations: [
      'Compare projected expenses against your income to ensure your budget stays balanced.',
      'Look for opportunities to cap or reduce variable costs if projections exceed comfort levels.',
    ],
  };
};

const evaluateHousingAffordability = (input: ScenarioInput): ScenarioResult => {
  const { data, context } = input;
  const housingCost = Number(data.housingCost ?? 0);
  const housingBudgetPercentage = Number(data.housingBudgetPercentage ?? 30);

  const recommendedHousingBudget = (housingBudgetPercentage / 100) * context.monthlyIncome;
  const affordabilityRatio = housingCost / (context.monthlyIncome || 1);
  const withinGuideline = housingCost <= recommendedHousingBudget;

  const summary = withinGuideline
    ? `This housing cost keeps you within the ${housingBudgetPercentage}% guideline of your monthly income.`
    : `This housing cost is above the ${housingBudgetPercentage}% guideline and may stress your budget.`;

  const recommendations: string[] = [];
  if (!withinGuideline) {
    recommendations.push('Aim to keep housing at or below 30% of take-home pay for flexibility.');
    recommendations.push('Consider negotiating rent, finding roommates, or increasing income before committing.');
  } else {
    recommendations.push('Great job keeping housing within healthy limits—protect that disposable income!');
  }

  return {
    type: ScenarioType.HOUSING_AFFORDABILITY,
    summary,
    details: {
      housingCost: clampNumber(housingCost),
      recommendedHousingBudget: clampNumber(recommendedHousingBudget),
      housingBudgetPercentage: clampNumber(housingBudgetPercentage),
      affordabilityRatio: clampNumber(affordabilityRatio * 100),
      withinGuideline,
    },
    recommendations,
  };
};

const evaluateDebtPayoff = (input: ScenarioInput): ScenarioResult => {
  const { data } = input;
  const currentDebt = Number(data.currentDebt ?? 0);
  const interestRatePercent = Number(data.interestRatePercent ?? 0);
  const monthlyPayment = Number(data.monthlyPayment ?? 0);

  const monthlyRate = interestRatePercent / 100 / 12;
  let balance = currentDebt;
  let months = 0;
  let totalInterestPaid = 0;

  // Safety guard to avoid infinite loops if payment is too small
  if (monthlyPayment <= balance * monthlyRate) {
    return {
      type: ScenarioType.DEBT_PAYOFF,
      summary: 'Monthly payment is too low to cover interest—consider increasing it to make progress.',
      details: {
        currentDebt: clampNumber(currentDebt),
        interestRatePercent: clampNumber(interestRatePercent),
        monthlyPayment: clampNumber(monthlyPayment),
        monthsToPayoff: null,
        totalInterestPaid: clampNumber(totalInterestPaid),
      },
      recommendations: [
        'Increase monthly payments so they exceed the interest charged each month.',
        'Explore refinancing options to secure a lower interest rate.',
      ],
    };
  }

  while (balance > 0 && months < 600) {
    const interest = balance * monthlyRate;
    totalInterestPaid += interest;
    balance = balance + interest - monthlyPayment;
    months += 1;
    if (balance < 0) {
      balance = 0;
    }
  }

  const payoffMonths = balance > 0 ? null : months;
  const summary =
    payoffMonths !== null
      ? `You can pay off this debt in about ${payoffMonths} month(s) by contributing $${clampNumber(
          monthlyPayment
        )} monthly.`
      : 'With these inputs the debt payoff extends beyond 50 years—consider increasing your monthly payment.';

  return {
    type: ScenarioType.DEBT_PAYOFF,
    summary,
    details: {
      currentDebt: clampNumber(currentDebt),
      interestRatePercent: clampNumber(interestRatePercent),
      monthlyPayment: clampNumber(monthlyPayment),
      monthsToPayoff: payoffMonths,
      totalInterestPaid: clampNumber(totalInterestPaid),
    },
    recommendations: [
      'Automate payments so you never miss a due date.',
      'If extra cash appears (bonus, tax refund), throw it at the principal to shorten the payoff timeline.',
    ],
  };
};

const evaluateSavingsGoal = (input: ScenarioInput): ScenarioResult => {
  const { data, context } = input;
  const targetAmount = Number(data.targetAmount ?? 0);
  const currentAmount = Number(data.currentAmount ?? context.bankBalance ?? 0);
  const monthlyContribution =
    data.monthlyContribution !== undefined
      ? Number(data.monthlyContribution)
      : Math.max(context.disposableIncome, 0);

  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const monthsToGoal =
    monthlyContribution > 0 ? remainingAmount / monthlyContribution : Infinity;
  const completion = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

  const summary =
    monthlyContribution > 0
      ? `You are about ${Math.ceil(monthsToGoal)} month(s) away from this savings goal if you keep contributing $${clampNumber(
          monthlyContribution
        )} each month.`
      : 'Add a monthly contribution to start making progress on this savings goal.';

  const recommendations: string[] = [];
  if (!Number.isFinite(monthsToGoal)) {
    recommendations.push('Set a realistic monthly contribution so you can reach the goal.');
  } else if (monthsToGoal > 12) {
    recommendations.push('Consider boosting monthly contributions or extending the timeline.');
  } else {
    recommendations.push('You are on track—keep depositing consistently to hit the goal.');
  }

  return {
    type: ScenarioType.SAVINGS_GOAL,
    summary,
    details: {
      targetAmount: clampNumber(targetAmount),
      currentAmount: clampNumber(currentAmount),
      monthlyContribution: clampNumber(monthlyContribution),
      monthsToGoal: roundMonths(monthsToGoal),
      completionPercentage: clampNumber(completion),
    },
    recommendations,
  };
};

export class ScenarioEngine {
  static evaluate(input: ScenarioInput): ScenarioResult {
    switch (input.type) {
      case ScenarioType.CAN_I_AFFORD:
        return evaluateCanIAfford(input);
      case ScenarioType.EXPENSE_PROJECTION:
        return evaluateExpenseProjection(input);
      case ScenarioType.HOUSING_AFFORDABILITY:
        return evaluateHousingAffordability(input);
      case ScenarioType.DEBT_PAYOFF:
        return evaluateDebtPayoff(input);
      case ScenarioType.SAVINGS_GOAL:
        return evaluateSavingsGoal(input);
      default:
        throw new Error(`Unsupported scenario type: ${input.type}`);
    }
  }
}
