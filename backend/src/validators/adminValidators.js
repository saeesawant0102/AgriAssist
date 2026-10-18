import { z } from 'zod';

const phoneRegex = /^\+?[0-9]{7,15}$/;

// Requirement: D19, GET /admin/users?status=&limit=&cursor=
export const listUsersQuerySchema = z.object({
  status: z.enum(['active', 'disabled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().positive().optional(),
});

// Requirement: GET/PUT/PATCH/DELETE /admin/users/:userId
export const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive({ message: 'userId must be a positive integer' }),
});

// Requirement: PUT /admin/users/:userId
export const updateFarmerUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim()
    .optional(),
  phone: z
    .string()
    .regex(phoneRegex, 'Phone must be 7-15 digits with optional leading +')
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z
    .string()
    .max(255, 'Address must be at most 255 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
});

// Requirement: PATCH /admin/users/:userId/status
export const updateFarmerStatusSchema = z.object({
  status: z.enum(['active', 'disabled'], {
    errorMap: () => ({ message: "status must be either 'active' or 'disabled'" }),
  }),
});
