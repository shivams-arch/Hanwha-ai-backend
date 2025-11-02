import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { AppDataSource } from '../config/database.config';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { invalidateUserCalculations } from '../utils/cache/calculation-cache';
import { invalidateDashboardCache } from '../utils/cache/dashboard-cache';

/**
 * User Response Interface (sanitized)
 */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  profileData: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile Data Interface (matches User entity FinancialProfile)
 */
export interface ProfileData {
  bankAccountBalance?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  fixedExpenses?: {
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

/**
 * Update Profile DTO
 */
export interface UpdateProfileDto {
  name?: string;
  profileData?: ProfileData;
}

/**
 * User Service
 * Handles user profile management operations
 */
export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.debug(`Retrieved profile for user: ${userId}`);
    return this.sanitizeUser(user);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateData: UpdateProfileDto): Promise<UserResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update name if provided
    if (updateData.name !== undefined) {
      if (updateData.name.trim().length === 0) {
        throw new ValidationError('Name cannot be empty');
      }
      user.name = updateData.name;
    }

    // Update profile data if provided
    if (updateData.profileData !== undefined) {
      // Merge with existing profile data
      user.profileData = {
        ...user.profileData,
        ...updateData.profileData,
      };
    }

    // Save updated user
    await this.userRepository.save(user);

    logger.info(`Updated profile for user: ${userId}`);
    if (updateData.profileData) {
      await invalidateUserCalculations(userId);
      await invalidateDashboardCache(userId);
    }
    return this.sanitizeUser(user);
  }

  /**
   * Get user by ID (admin only - includes more details)
   */
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // TypeORM soft delete (sets deletedAt timestamp)
    await this.userRepository.softRemove(user);

    logger.info(`Soft deleted user: ${userId}`);
  }

  /**
   * Get financial summary from profile data
   */
  async getFinancialSummary(userId: string): Promise<{
    bankAccountBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    disposableIncome: number;
    savingsRate: number;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const profileData = user.profileData || ({} as any);
    const bankAccountBalance = profileData.bankAccountBalance || 0;
    const monthlyIncome = profileData.monthlyIncome || 0;
    const monthlyExpenses = profileData.monthlyExpenses || 0;
    const disposableIncome = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (disposableIncome / monthlyIncome) * 100 : 0;

    return {
      bankAccountBalance,
      monthlyIncome,
      monthlyExpenses,
      disposableIncome,
      savingsRate: Number(savingsRate.toFixed(2)),
    };
  }

  /**
   * Update financial data specifically
   */
  async updateFinancialData(
    userId: string,
    financialData: {
      bankAccountBalance?: number;
      monthlyIncome?: number;
      monthlyExpenses?: number;
      fixedExpenses?: ProfileData['fixedExpenses'];
    }
  ): Promise<UserResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate financial data
    if (financialData.bankAccountBalance !== undefined && financialData.bankAccountBalance < 0) {
      throw new ValidationError('Bank account balance cannot be negative');
    }

    if (financialData.monthlyIncome !== undefined && financialData.monthlyIncome < 0) {
      throw new ValidationError('Monthly income cannot be negative');
    }

    if (financialData.monthlyExpenses !== undefined && financialData.monthlyExpenses < 0) {
      throw new ValidationError('Monthly expenses cannot be negative');
    }

    // Update profile data with financial information
    user.profileData = {
      ...user.profileData,
      ...financialData,
    } as any;

    await this.userRepository.save(user);

    logger.info(`Updated financial data for user: ${userId}`);
    await invalidateUserCalculations(userId);
    await invalidateDashboardCache(userId);
    return this.sanitizeUser(user);
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileData: user.profileData,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
