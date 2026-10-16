import { z } from 'zod';

export const forecastQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((val) => [5, 6, 7].includes(val), {
      message: 'Forecast days must be 5, 6, or 7',
    })
    .default(7),
});
