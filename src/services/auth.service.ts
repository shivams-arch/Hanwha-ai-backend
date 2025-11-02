import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { AppDataSource } from '../config/database.config';
import { envConfig } from '../config/env.config';
import { getRedisClient } from '../config/redis.config';
import {
  AuthenticationError,
  ConflictError,
} from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { CategoryService } from './category.service';

/**
 * Token Response Interface
 */
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * User Response Interface
 */
interface UserResponse {
  id: string;
  email: string;
  name: string;
  profileData: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication Service
 * Handles user registration, login, token generation, and session management
 */
export class AuthService {
  private userRepository: Repository<User>;
  private categoryService: CategoryService;
  private readonly SALT_ROUNDS = 10;
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
  private readonly SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.categoryService = new CategoryService();
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    name: string,
    profileData?: any
  ): Promise<{ user: UserResponse; tokens: TokenResponse }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      profileData: profileData || {},
    });

    await this.userRepository.save(user);

    logger.info(`New user registered: ${email}`);

    // Create default categories for the new user
    await this.categoryService.createDefaultCategories(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store session in Redis
    await this.storeSession(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: UserResponse; tokens: TokenResponse }> {
    // Find user by email
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    logger.info(`User logged in: ${email}`);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store session in Redis
    await this.storeSession(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    const redisClient = getRedisClient();

    // Blacklist access token
    const decoded = jwt.decode(accessToken) as any;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redisClient.setEx(`blacklist:${accessToken}`, ttl, 'true');
    }

    // Remove session from Redis
    await redisClient.del(`session:${userId}`);

    // Blacklist refresh token if provided
    if (refreshToken) {
      const decodedRefresh = jwt.decode(refreshToken) as any;
      const refreshTtl = decodedRefresh.exp - Math.floor(Date.now() / 1000);
      if (refreshTtl > 0) {
        await redisClient.setEx(`blacklist:${refreshToken}`, refreshTtl, 'true');
      }
    }

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const redisClient = getRedisClient();

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, envConfig.JWT_REFRESH_SECRET) as any;

      // Check if token is blacklisted
      const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new AuthenticationError('Refresh token has been revoked');
      }

      // Check if session exists
      const session = await redisClient.get(`session:${decoded.id}`);
      if (!session) {
        throw new AuthenticationError('Session not found');
      }

      // Find user
      const user = await this.userRepository.findOne({ where: { id: decoded.id } });
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update session
      await this.storeSession(user.id, tokens.refreshToken);

      logger.info(`Access token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }
      throw error;
    }
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<TokenResponse> {
    const payload = {
      id: user.id,
      email: user.email,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, envConfig.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, envConfig.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Store session in Redis
   */
  private async storeSession(userId: string, refreshToken: string): Promise<void> {
    const redisClient = getRedisClient();
    await redisClient.setEx(
      `session:${userId}`,
      this.SESSION_EXPIRY,
      JSON.stringify({
        refreshToken,
        createdAt: new Date().toISOString(),
      })
    );
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
