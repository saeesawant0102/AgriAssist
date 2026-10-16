import { z } from 'zod';

// Requirement: D1, Farm.Validate, Farm.Add
export const addFarmSchema = z.object({
  farm_name: z
    .string({ required_error: 'Farm name is required' })
    .min(1, 'Farm name cannot be empty')
    .max(100, 'Farm name cannot exceed 100 characters')
    .trim(),
  location: z
    .string({ required_error: 'Location is required' })
    .min(1, 'Location cannot be empty')
    .max(255, 'Location cannot exceed 255 characters')
    .trim(),
  area: z.coerce
    .number({ required_error: 'Area is required' })
    .positive('Area must be greater than zero'),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  farmer_id: z.coerce.number().int().positive().optional().nullable(),
});

// Requirement: D1, Farm.Validate, Farm.Edit
export const updateFarmSchema = z.object({
  farm_name: z
    .string()
    .min(1, 'Farm name cannot be empty')
    .max(100, 'Farm name cannot exceed 100 characters')
    .trim()
    .optional(),
  location: z
    .string()
    .min(1, 'Location cannot be empty')
    .max(255, 'Location cannot exceed 255 characters')
    .trim()
    .optional(),
  area: z.coerce.number().positive('Area must be greater than zero').optional(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
});
