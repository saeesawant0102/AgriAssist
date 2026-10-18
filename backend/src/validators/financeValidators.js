import { z } from 'zod';

/**
 * Zod validation schemas for Financial and Profitability endpoints.
 * Requirements: Section 12.1, Section 12.8
 */

export const farmIdParamSchema = z.object({
  farmId: z.coerce.number().int().positive('Farm ID must be a positive integer'),
});

export const recordIdParamSchema = z.object({
  recordId: z.coerce.number().int().positive('Record ID must be a positive integer'),
});

export const recordInputSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
});

export const updateRecordSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD').optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});

export const calculateProfitSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD').optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD').optional().nullable(),
});
