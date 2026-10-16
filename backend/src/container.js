import { FirebaseAuthGateway } from './auth/FirebaseAuthGateway.js';
import { env } from './config/env.js';
import { Database } from './db/connection.js';
import { SystemClock } from './utils/clock.js';

/**
 * Builds runtime production dependencies.
 * @returns {Promise<{ db: Database, clock: SystemClock, authGateway: FirebaseAuthGateway }>}
 */
export async function createContainer() {
  const db = await Database.open(env.DATABASE_PATH);
  const clock = new SystemClock();
  const authGateway = new FirebaseAuthGateway();

  return {
    db,
    clock,
    authGateway,
  };
}
