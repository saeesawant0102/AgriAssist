import autocannon from 'autocannon';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../src/app.js';
import { Database } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { FakeAuthGateway } from '../helpers/FakeAuthGateway.js';
import { FakeWeatherService } from '../helpers/FakeWeatherService.js';
import { seedTestData } from '../helpers/seed.js';
import { SystemClock } from '../../src/utils/clock.js';

const systemClock = new SystemClock();

async function runLoadTest() {
  console.log('====================================================');
  console.log(' AgriAssist Load Test (PE-1, PE-2, PE-3, PE-4)       ');
  console.log(' 100 concurrent connections against authenticated API');
  console.log('====================================================');

  const testDbDir = path.resolve('./data/test-perf');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  const testDbPath = path.join(testDbDir, 'loadtest.db');

  // Clean previous test db
  for (const f of [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`]) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
      } catch {
        // ignore cleanup error
      }
    }
  }

  const db = await Database.open(testDbPath);
  await migrate(db);

  const authGateway = new FakeAuthGateway();
  const weatherService = new FakeWeatherService();
  const clock = systemClock;

  const seeded = await seedTestData(db, authGateway, clock);
  const farmer1 = seeded.farmers[0];
  const authHeader = `Bearer bearer-${farmer1.firebaseUid}`;

  const app = createApp({
    db,
    authGateway,
    weatherService,
    clock,
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[LoadTest] Test server listening on ${baseUrl}`);

  const endpointsToTest = [
    { title: 'Farmer Dashboard (PE-2)', path: '/api/v1/dashboard' },
    { title: 'Farms List (PE-2, PE-4)', path: '/api/v1/farms' },
    { title: 'Financial Reports (PE-2)', path: '/api/v1/reports/profitability' },
    { title: 'Current Weather (PE-3)', path: `/api/v1/farms/${farmer1.farms[0].farmId}/weather/current` },
  ];

  let allPassed = true;

  try {
    for (const ep of endpointsToTest) {
      console.log(`\n--- Running load test on: ${ep.title} (${ep.path}) ---`);

      const result = await autocannon({
        url: `${baseUrl}${ep.path}`,
        connections: 100,
        duration: 5,
        headers: {
          Authorization: authHeader,
        },
      });

      console.log(`Requests: ${result.requests.total} total (${result.requests.average} req/sec)`);
      console.log(`Latency: avg=${result.latency.average}ms, p99=${result.latency.p99}ms, max=${result.latency.max}ms`);
      console.log(`Errors: ${result.errors}, Timeouts: ${result.timeouts}, 2xx: ${result['2xx']}, Non-2xx: ${result.non2xx}`);

      if (result.errors > 0 || result.timeouts > 0 || result.non2xx > 0) {
        console.error(`[LoadTest FAILED] ${ep.title} encountered errors or non-2xx responses!`);
        allPassed = false;
      }

      if (result.latency.p99 > 3000) {
        console.error(`[LoadTest FAILED] ${ep.title} p99 latency exceeded 3000ms: ${result.latency.p99}ms`);
        allPassed = false;
      }
    }
  } finally {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await db.close();

    // Cleanup test db
    for (const f of [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`]) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {
          // ignore cleanup error
        }
      }
    }
    try {
      fs.rmdirSync(testDbDir);
    } catch {
      // ignore cleanup error
    }
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('[LoadTest SUCCESS] All endpoints met PE-1, PE-2, PE-3 performance criteria.');
    process.exit(0);
  } else {
    console.error('[LoadTest FAILURE] Performance criteria not met.');
    process.exit(1);
  }
}

runLoadTest().catch((err) => {
  console.error('[LoadTest] Unexpected error:', err);
  process.exit(1);
});
