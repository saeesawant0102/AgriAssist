import { z } from 'zod';

const phoneRegex = /^\+?[0-9]{7,15}$/;

// Requirement: D1, Auth.Register
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
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

// Requirement: D1, D2, Auth.Profile.Update
export const updateProfileSchema = z.object({
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
