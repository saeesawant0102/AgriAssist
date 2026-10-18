import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_PATH: z.string().default('./data/agriassist.db'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().default('./secrets/service-account.json'),
  FIREBASE_PROJECT_ID: z.string().default('demo-agriassist'),
  ALLOWED_ORIGINS: z
    .string()
    .default(
      'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174'
    ),
  OPEN_METEO_BASE_URL: z.string().default('https://api.open-meteo.com'),
  OPEN_METEO_GEOCODING_URL: z.string().default('https://geocoding-api.open-meteo.com'),
  WEATHER_TIMEOUT_MS: z.coerce.number().default(5000),
  WEATHER_CACHE_TTL_MINUTES: z.coerce.number().default(30),
  FORECAST_DAYS: z.coerce.number().default(7),
  IRRIGATION_REFRESH_CRON: z.string().default('0 */6 * * *'),
  BACKUP_CRON: z.string().default('0 2 * * *'),
  BACKUP_DIR: z.string().default('./data/backups'),
  BACKUP_RETAIN_COUNT: z.coerce.number().default(7),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
