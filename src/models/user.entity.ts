import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Category } from './category.entity';
import { Transaction } from './transaction.entity';
import { FinancialGoal } from './financial-goal.entity';
import { Conversation } from './conversation.entity';

export interface FinancialProfile {
  bankAccountBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  fixedExpenses: {
    rent?: number;
    utilities?: number;
    insurance?: number;
    carPayment?: number;
    studentLoan?: number;
    subscriptions?: number;
    phone?: number;
    internet?: number;
    [key: string]: number | undefined;
  };
  jobTitle?: string;
  employmentStatus?: string;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'jsonb', nullable: true })
  profileData: FinancialProfile;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => FinancialGoal, (goal) => goal.user)
  financialGoals: FinancialGoal[];

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
