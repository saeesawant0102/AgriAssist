import { env } from './config/env.js';
import { Database } from './db/connection.js';
import { SystemClock } from './utils/clock.js';

/**
 * Builds runtime production dependencies.
 * @returns {Promise<{ db: Database, clock: SystemClock }>}
 */
export async function createContainer() {
  const db = await Database.open(env.DATABASE_PATH);
  const clock = new SystemClock();

  return {
    db,
    clock,
  };
}
