import Joi from 'joi';

/**
 * Fixed Expenses Schema (matches User entity FinancialProfile)
 */
const fixedExpensesSchema = Joi.object({
  rent: Joi.number().min(0).optional(),
  utilities: Joi.number().min(0).optional(),
  insurance: Joi.number().min(0).optional(),
  carPayment: Joi.number().min(0).optional(),
  studentLoan: Joi.number().min(0).optional(),
  subscriptions: Joi.number().min(0).optional(),
  phone: Joi.number().min(0).optional(),
  internet: Joi.number().min(0).optional(),
}).unknown(true).optional(); // Allow additional expense fields

/**
 * Profile Data Schema (matches User entity FinancialProfile)
 */
const profileDataSchema = Joi.object({
  bankAccountBalance: Joi.number().min(0).optional(),
  monthlyIncome: Joi.number().min(0).optional(),
  monthlyExpenses: Joi.number().min(0).optional(),
  fixedExpenses: fixedExpensesSchema,
  jobTitle: Joi.string().max(200).optional(),
  employmentStatus: Joi.string().max(100).optional(),
}).optional();

/**
 * Update Profile Validation Schema
 */
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  profileData: profileDataSchema,
}).min(1); // At least one field must be provided

/**
 * Update Financial Data Validation Schema
 */
export const updateFinancialDataSchema = Joi.object({
  bankAccountBalance: Joi.number().min(0).optional(),
  monthlyIncome: Joi.number().min(0).optional(),
  monthlyExpenses: Joi.number().min(0).optional(),
  fixedExpenses: fixedExpensesSchema,
}).min(1); // At least one field must be provided

/**
 * User ID Param Validation Schema
 */
export const userIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
