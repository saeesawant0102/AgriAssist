import { FirebaseAuthGateway } from './auth/FirebaseAuthGateway.js';
import { env } from './config/env.js';
import { Database } from './db/connection.js';
import { SystemClock } from './utils/clock.js';
import { WeatherAPI } from './weather/WeatherAPI.js';

/**
 * Builds runtime production dependencies.
 * @returns {Promise<{ db: Database, clock: SystemClock, authGateway: FirebaseAuthGateway, weatherService: WeatherAPI }>}
 */
export async function createContainer() {
  const db = await Database.open(env.DATABASE_PATH);
  const clock = new SystemClock();
  const authGateway = new FirebaseAuthGateway();
  const weatherService = new WeatherAPI({
    baseUrl: env.OPEN_METEO_BASE_URL,
    timeoutMs: env.WEATHER_TIMEOUT_MS,
  });

  return {
    db,
    clock,
    authGateway,
    weatherService,
  };
}

