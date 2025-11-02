import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

export enum CategoryType {
  FINANCE = 'Finance',
  EDUCATION = 'Education',
  FAMILY = 'Family',
  FRIENDS = 'Friends',
  VACATION = 'Weekend Activities/Vacation',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
  })
  name: CategoryType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  budgetAllocated: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  spentAmount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.category)
  transactions: Transaction[];
}
