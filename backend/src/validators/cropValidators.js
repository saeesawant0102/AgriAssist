import { z } from 'zod';
import { GROWTH_STAGES } from '../config/constants.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Requirement: D1, D3, Crop.Add
export const addCropSchema = z
  .object({
    crop_name: z
      .string({ required_error: 'Crop name is required' })
      .min(1, 'Crop name cannot be empty')
      .max(100, 'Crop name cannot exceed 100 characters')
      .trim(),
    variety: z
      .string()
      .max(100, 'Variety cannot exceed 100 characters')
      .trim()
      .optional()
      .nullable(),
    sowing_date: z
      .string({ required_error: 'Sowing date is required' })
      .regex(dateRegex, 'Sowing date must be in YYYY-MM-DD format'),
    harvest_date: z
      .string()
      .regex(dateRegex, 'Harvest date must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    growth_stage: z.enum(GROWTH_STAGES).optional().default('Sowing'),
  })
  .refine(
    (data) => {
      if (data.harvest_date && data.sowing_date) {
        return data.harvest_date >= data.sowing_date;
      }
      return true;
    },
    {
      message: 'Harvest date must be on or after sowing date',
      path: ['harvest_date'],
    }
  );

// Requirement: D1, D3, Crop.Edit
export const updateCropSchema = z
  .object({
    crop_name: z
      .string()
      .min(1, 'Crop name cannot be empty')
      .max(100, 'Crop name cannot exceed 100 characters')
      .trim()
      .optional(),
    variety: z
      .string()
      .max(100, 'Variety cannot exceed 100 characters')
      .trim()
      .optional()
      .nullable(),
    sowing_date: z
      .string()
      .regex(dateRegex, 'Sowing date must be in YYYY-MM-DD format')
      .optional(),
    harvest_date: z
      .string()
      .regex(dateRegex, 'Harvest date must be in YYYY-MM-DD format')
      .optional()
      .nullable(),
    growth_stage: z.enum(GROWTH_STAGES).optional(),
  })
  .refine(
    (data) => {
      if (data.harvest_date && data.sowing_date) {
        return data.harvest_date >= data.sowing_date;
      }
      return true;
    },
    {
      message: 'Harvest date must be on or after sowing date',
      path: ['harvest_date'],
    }
  );

// Requirement: D3, Crop.Stage.Update
export const updateStageSchema = z.object({
  growth_stage: z.enum(GROWTH_STAGES, {
    errorMap: () => ({
      message: `Growth stage must be one of: ${GROWTH_STAGES.join(', ')}`,
    }),
  }),
});
