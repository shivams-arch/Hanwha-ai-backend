import {
  FinancialGoal,
  GoalMetricUnit,
  GoalStatus,
  GoalType,
} from '../../models/financial-goal.entity';

export interface GoalProgress {
  id: string;
  name: string;
  goalType: GoalType | string;
  targetAmount: number;
  currentAmount: number;
  completionPercentage: number;
  status: GoalStatus;
  deadline: Date | null;
  metricUnit: GoalMetricUnit;
  metadata: Record<string, any> | null;
  computed: {
    remainingAmount: number;
    timeRemainingDays: number | null;
    education?: {
      hoursRemaining: number;
      weeklyHoursNeeded: number | null;
      nextMilestone: string | null;
      focusAreas: string[];
      upcomingDeadline: string | null;
    };
  };
}

const toNumber = (value: unknown, defaultValue = 0): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : defaultValue;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }
  return defaultValue;
};

const normalizeMetricUnit = (metricUnit?: GoalMetricUnit | null): GoalMetricUnit => {
  return metricUnit !== undefined && metricUnit !== null ? metricUnit : GoalMetricUnit.CURRENCY;
};

const extractUpcomingMilestone = (
  metadata: Record<string, any> | null | undefined,
  now: Date
): { title: string | null; dueDate: string | null } => {
  if (!metadata) {
    return { title: null, dueDate: null };
  }

  const nextAction =
    typeof metadata.nextAction === 'string' && metadata.nextAction.trim().length > 0
      ? metadata.nextAction.trim()
      : null;

  if (nextAction) {
    return {
      title: nextAction,
      dueDate:
        metadata.nextActionDueDate !== undefined && metadata.nextActionDueDate !== null
          ? metadata.nextActionDueDate
          : null,
    };
  }

  const milestones = Array.isArray(metadata.milestones) ? metadata.milestones : [];
  const upcoming = milestones.find((milestone: any) => {
    if (!milestone || !milestone.dueDate) {
      return false;
    }
    const due = new Date(milestone.dueDate);
    return Number.isFinite(due.getTime()) && due.getTime() >= now.getTime();
  });

  if (upcoming && upcoming.title) {
    return {
      title: upcoming.title,
      dueDate: upcoming.dueDate !== undefined && upcoming.dueDate !== null ? upcoming.dueDate : null,
    };
  }

  return { title: null, dueDate: null };
};

const buildEducationComputed = (
  goal: FinancialGoal,
  metadata: Record<string, any> | null,
  now: Date
):
  | {
      hoursRemaining: number;
      weeklyHoursNeeded: number | null;
      nextMilestone: string | null;
      focusAreas: string[];
      upcomingDeadline: string | null;
    }
  | undefined => {
  if (goal.goalType !== GoalType.EDUCATION && goal.metricUnit !== GoalMetricUnit.HOURS) {
    return undefined;
  }

  const studyPlan =
    metadata && typeof metadata === 'object' ? (metadata.studyPlan as Record<string, any>) : null;
  const totalHours = toNumber(
    studyPlan && studyPlan.totalHours !== undefined ? studyPlan.totalHours : goal.targetAmount
  );
  const completedHours = toNumber(
    studyPlan && studyPlan.completedHours !== undefined
      ? studyPlan.completedHours
      : goal.currentAmount
  );
  const hoursRemaining = Math.max(totalHours - completedHours, 0);

  const examDateRaw =
    metadata && typeof metadata.examDate === 'string' && metadata.examDate.trim().length > 0
      ? metadata.examDate
      : null;
  const examDate = examDateRaw ? new Date(examDateRaw) : null;
  const daysToExam =
    examDate && Number.isFinite(examDate.getTime())
      ? Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
  const weeksToExam =
    daysToExam !== null && daysToExam > 0 ? Math.max(Math.ceil(daysToExam / 7), 1) : null;
  const weeklyHoursNeeded =
    weeksToExam !== null && weeksToExam > 0
      ? Number((hoursRemaining / weeksToExam).toFixed(1))
      : null;

  const upcoming = extractUpcomingMilestone(metadata, now);

  const focusSource =
    studyPlan && Array.isArray(studyPlan.upcomingFocusAreas) ? studyPlan.upcomingFocusAreas : [];
  const focusAreas = focusSource.filter((item): item is string => typeof item === 'string');

  const upcomingDeadline =
    (upcoming.dueDate !== undefined && upcoming.dueDate !== null
      ? upcoming.dueDate
      : examDate && Number.isFinite(examDate.getTime())
      ? examDate.toISOString()
      : null);

  return {
    hoursRemaining: Number(hoursRemaining.toFixed(1)),
    weeklyHoursNeeded,
    nextMilestone: upcoming.title,
    focusAreas,
    upcomingDeadline,
  };
};

export const buildGoalProgress = (
  goal: FinancialGoal,
  referenceDate: Date = new Date()
): GoalProgress => {
  const targetAmount = toNumber(goal.targetAmount);
  const currentAmount = toNumber(goal.currentAmount);
  const completion =
    targetAmount > 0 ? Number(((currentAmount / targetAmount) * 100).toFixed(2)) : 0;
  const metricUnit = normalizeMetricUnit(goal.metricUnit);
  const metadata = goal.metadata !== undefined ? goal.metadata : null;
  const remaining = Math.max(targetAmount - currentAmount, 0);

  const deadline =
    goal.deadline instanceof Date && Number.isFinite(goal.deadline.getTime())
      ? goal.deadline
      : null;
  const timeRemainingDays =
    deadline !== null
      ? Math.ceil((deadline.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const educationComputed = buildEducationComputed(goal, metadata, referenceDate);

  return {
    id: goal.id,
    name: goal.name,
    goalType: goal.goalType,
    targetAmount: Number(targetAmount.toFixed(2)),
    currentAmount: Number(currentAmount.toFixed(2)),
    completionPercentage: completion,
    status: goal.status,
    deadline,
    metricUnit,
    metadata,
    computed: {
      remainingAmount: Number(remaining.toFixed(2)),
      timeRemainingDays,
      ...(educationComputed ? { education: educationComputed } : {}),
    },
  };
};
