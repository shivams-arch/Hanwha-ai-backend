import { buildGoalProgress } from '../../src/utils/calculations/goal-progress';
import {
  GoalMetricUnit,
  GoalStatus,
  GoalType,
} from '../../src/models/financial-goal.entity';

describe('buildGoalProgress', () => {
  it('computes education-specific insights with study metadata', () => {
    const referenceDate = new Date('2025-04-01T00:00:00.000Z');

    const goal = {
      id: 'goal-education-1',
      userId: 'user-1',
      goalType: GoalType.EDUCATION,
      name: 'AWS Solutions Architect Exam',
      targetAmount: 120,
      currentAmount: 36,
      targetDate: new Date('2025-05-01T00:00:00.000Z'),
      currentDate: referenceDate,
      deadline: new Date('2025-05-01T00:00:00.000Z'),
      status: GoalStatus.ACTIVE,
      description: 'Crack the AWS SAA-C03 exam',
      metricUnit: GoalMetricUnit.HOURS,
      metadata: {
        examDate: '2025-05-01',
        studyPlan: {
          totalHours: 120,
          completedHours: 36,
          weeklyTargetHours: 10,
          upcomingFocusAreas: ['Security', 'Architecting'],
        },
        milestones: [
          {
            title: 'Finish networking module',
            dueDate: '2025-04-15',
          },
          {
            title: 'Mock exam dry run',
            dueDate: '2025-04-25',
          },
        ],
      },
      createdAt: referenceDate,
      updatedAt: referenceDate,
    } as unknown as Parameters<typeof buildGoalProgress>[0];

    const progress = buildGoalProgress(goal, referenceDate);

    expect(progress.metricUnit).toBe(GoalMetricUnit.HOURS);
    expect(progress.computed.remainingAmount).toBeCloseTo(84);
    expect(progress.computed.timeRemainingDays).toBe(30);

    expect(progress.computed.education).toBeDefined();
    const education = progress.computed.education!;
    expect(education.hoursRemaining).toBeCloseTo(84);
    expect(education.weeklyHoursNeeded).toBeCloseTo(16.8);
    expect(education.nextMilestone).toBe('Finish networking module');
    expect(education.focusAreas).toEqual(['Security', 'Architecting']);
    expect(education.upcomingDeadline).toBe('2025-04-15');
  });

  it('defaults to currency unit and skips education insights for financial goals', () => {
    const referenceDate = new Date('2025-04-01T00:00:00.000Z');

    const goal = {
      id: 'goal-savings-1',
      userId: 'user-1',
      goalType: GoalType.SAVINGS,
      name: 'Vacation Fund',
      targetAmount: 5000,
      currentAmount: 1250,
      deadline: new Date('2025-12-31T00:00:00.000Z'),
      status: GoalStatus.ACTIVE,
      description: 'Save for a Bali getaway',
      createdAt: referenceDate,
      updatedAt: referenceDate,
      metadata: null,
    } as unknown as Parameters<typeof buildGoalProgress>[0];

    const progress = buildGoalProgress(goal, referenceDate);

    expect(progress.metricUnit).toBe(GoalMetricUnit.CURRENCY);
    expect(progress.computed.remainingAmount).toBeCloseTo(3750);
    expect(progress.computed.education).toBeUndefined();
  });
});

