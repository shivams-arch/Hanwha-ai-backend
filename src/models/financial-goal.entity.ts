import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum GoalType {
  EMERGENCY_FUND = 'Emergency Fund',
  HOUSE_DOWN_PAYMENT = 'House Down Payment',
  DEBT_PAYOFF = 'Debt Payoff',
  SAVINGS = 'General Savings',
  INVESTMENT = 'Investment',
  EDUCATION = 'Education',
  VACATION = 'Vacation',
  OTHER = 'Other',
}

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

export enum GoalMetricUnit {
  CURRENCY = 'currency',
  HOURS = 'hours',
  POINTS = 'points',
  TASKS = 'tasks',
  PERCENT = 'percent',
  NONE = 'none',
}

@Entity('financial_goals')
export class FinancialGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: GoalType,
  })
  goalType: GoalType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  targetAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentAmount: number;

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column({
    type: 'enum',
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
  })
  status: GoalStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: GoalMetricUnit,
    default: GoalMetricUnit.CURRENCY,
  })
  metricUnit: GoalMetricUnit;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.financialGoals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
