import { z } from 'zod';

/**
 * Zod validation schemas for irrigation endpoints.
 * Requirement: Section 12.1, Section 12.7
 */

export const cropIdParamSchema = z.object({
  cropId: z.coerce.number().int().positive('Crop ID must be a positive integer'),
});

export const scheduleIdParamSchema = z.object({
  scheduleId: z.coerce.number().int().positive('Schedule ID must be a positive integer'),
});
