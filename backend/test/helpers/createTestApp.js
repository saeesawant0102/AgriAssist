import { createApp } from '../../src/app.js';
import { Database } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { FakeAuthGateway } from './FakeAuthGateway.js';
import { FakeWeatherService } from './FakeWeatherService.js';
import { createFixedClock } from './fixedClock.js';

/**
 * Creates an Express app wired to an in-memory database and test fakes.
 * Runs all migrations before resolving.
 * @returns {Promise<{ app: import('express').Application, db: Database, authGateway: FakeAuthGateway, weatherService: FakeWeatherService, clock: import('../../src/utils/clock.js').FixedClock }>}
 */
export async function createTestApp() {
  const db = await Database.open(':memory:');
  await migrate(db);

  const authGateway = new FakeAuthGateway();
  const weatherService = new FakeWeatherService();
  const clock = createFixedClock();

  const app = createApp({
    db,
    authGateway,
    weatherService,
    clock,
  });

  return {
    app,
    db,
    authGateway,
    weatherService,
    clock,
  };
}
