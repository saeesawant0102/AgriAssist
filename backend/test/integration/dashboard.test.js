import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as cropRepository from '../../src/repositories/cropRepository.js';
import * as farmRepository from '../../src/repositories/farmRepository.js';
import * as profitabilityRepository from '../../src/repositories/profitabilityRepository.js';
import * as userRepository from '../../src/repositories/userRepository.js';
import { createTestApp } from '../helpers/createTestApp.js';

describe('Farmer Dashboard and Reports Integration (Feature 7)', () => {
  let app;
  let db;
  let authGateway;
  let clock;

  beforeEach(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    db = testApp.db;
    authGateway = testApp.authGateway;
    clock = testApp.clock;
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  async function createFarmer(email, name = 'Test Farmer') {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name,
      email,
      password: 'Password123',
    });
    const dbUser = await userRepository.findUserByEmail(db, email);
    const token = `Bearer bearer-${dbUser.firebase_uid}`;
    return { token, farmer_id: regRes.body.data.farmer_id, user_id: dbUser.user_id };
  }

  async function createAdmin(email = 'admin@example.com', name = 'System Admin') {
    const fbUser = await authGateway.createUser({
      email,
      password: 'AdminPassword123',
      displayName: name,
    });
    const nowIso = clock.now().toISOString();
    let adminUserId;
    await db.transaction(async (tx) => {
      adminUserId = await userRepository.createUser(tx, {
        firebase_uid: fbUser.uid,
        user_type: 'administrator',
        name,
        email,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });
      await userRepository.createAdministrator(tx, {
        user_id: adminUserId,
        role: 'admin',
      });
    });
    return { token: `Bearer bearer-${fbUser.uid}`, user_id: adminUserId };
  }

  it('Farmer.view_dashboard: returns zeroes and nulls for a newly registered farmer with no farms', async () => {
    const farmer = await createFarmer('fresh@example.com', 'Fresh Farmer');

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', farmer.token);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      farm_count: 0,
      crop_count: 0,
      latest_advisory: null,
      next_irrigation_date: null,
      overall_net_profit: 0,
    });
  });

  it('Farmer.view_dashboard: calculates accurate farm_count, crop_count, profitability, advisory, and next irrigation date', async () => {
    const farmer = await createFarmer('active@example.com', 'Active Farmer');
    const nowIso = clock.now().toISOString();
    const today = nowIso.split('T')[0];

    // Seed Farm 1 and Farm 2
    const farm1Id = await farmRepository.insertFarm(db, {
      farmer_id: farmer.farmer_id,
      farm_name: 'Farm Alpha',
      location: 'Pune',
      area: 5.5,
      latitude: 18.5204,
      longitude: 73.8567,
      created_at: nowIso,
      updated_at: nowIso,
    });

    const farm2Id = await farmRepository.insertFarm(db, {
      farmer_id: farmer.farmer_id,
      farm_name: 'Farm Beta',
      location: 'Nashik',
      area: 8.0,
      latitude: 19.9975,
      longitude: 73.7898,
      created_at: nowIso,
      updated_at: nowIso,
    });

    // Seed Crops
    const crop1Id = await cropRepository.insertCrop(db, {
      farm_id: farm1Id,
      crop_name: 'Wheat',
      variety: 'Sharbati',
      sowing_date: '2026-01-10',
      harvest_date: '2026-05-10',
      growth_stage: 'Vegetative',
      created_at: nowIso,
      updated_at: nowIso,
    });

    const crop2Id = await cropRepository.insertCrop(db, {
      farm_id: farm1Id,
      crop_name: 'Rice',
      variety: 'Basmati',
      sowing_date: '2026-02-01',
      harvest_date: '2026-06-01',
      growth_stage: 'Sowing',
      created_at: nowIso,
      updated_at: nowIso,
    });

    const _crop3Id = await cropRepository.insertCrop(db, {
      farm_id: farm2Id,
      crop_name: 'Cotton',
      variety: 'Hybrid',
      sowing_date: '2026-03-01',
      harvest_date: '2026-08-01',
      growth_stage: 'Germination',
      created_at: nowIso,
      updated_at: nowIso,
    });

    // Seed Overall Profitability: Farm 1 net profit = 5000, Farm 2 net profit = -1200
    await profitabilityRepository.upsertOverallProfitability(db, farm1Id, {
      total_expense: 15000,
      total_income: 20000,
      net_profit: 5000,
      date: today,
      created_at: nowIso,
    });

    await profitabilityRepository.upsertOverallProfitability(db, farm2Id, {
      total_expense: 4200,
      total_income: 3000,
      net_profit: -1200,
      date: today,
      created_at: nowIso,
    });

    // Seed Advisory on Crop 2
    await db.run(
      `INSERT INTO crop_advisories (crop_id, recommendation, message, date, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [crop2Id, 'High temperatures expected', 'Irrigate in early morning', today, nowIso]
    );

    // Seed Irrigation Schedule with dates on Crop 1
    const schedResult = await db.run(
      `INSERT INTO irrigation_schedules (crop_id, start_date, end_date, frequency, water_required, skip_recommended, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crop1Id, today, '2026-10-25', 'Every 3 days', 25, 0, 'Normal irrigation', nowIso, nowIso]
    );
    const scheduleId = schedResult.lastID;

    // Insert 2 dates: 1 skipped, 1 upcoming scheduled
    await db.run(
      `INSERT INTO irrigation_schedule_dates (schedule_id, date, is_skipped) VALUES (?, ?, 1)`,
      [scheduleId, today]
    );
    await db.run(
      `INSERT INTO irrigation_schedule_dates (schedule_id, date, is_skipped) VALUES (?, ?, 0)`,
      [scheduleId, '2026-10-21']
    );

    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', farmer.token);

    expect(res.status).toBe(200);
    expect(res.body.data.farm_count).toBe(2);
    expect(res.body.data.crop_count).toBe(3);
    expect(res.body.data.overall_net_profit).toBe(3800); // 5000 - 1200 = 3800
    expect(res.body.data.next_irrigation_date).toBe('2026-10-21');
    expect(res.body.data.latest_advisory).not.toBeNull();
    expect(res.body.data.latest_advisory.crop_name).toBe('Rice');
    expect(res.body.data.latest_advisory.recommendation).toBe('High temperatures expected');
  });

  it('Farmer.view_reports: retrieves overall profitability across all farms owned by the farmer', async () => {
    const farmer = await createFarmer('reports@example.com', 'Reports Farmer');
    const nowIso = clock.now().toISOString();
    const today = nowIso.split('T')[0];

    const farm1Id = await farmRepository.insertFarm(db, {
      farmer_id: farmer.farmer_id,
      farm_name: 'Sunflower Fields',
      location: 'Nagpur',
      area: 12.0,
      latitude: 21.1458,
      longitude: 79.0882,
      created_at: nowIso,
      updated_at: nowIso,
    });

    await profitabilityRepository.upsertOverallProfitability(db, farm1Id, {
      total_expense: 8000,
      total_income: 14500,
      net_profit: 6500,
      date: today,
      created_at: nowIso,
    });

    const res = await request(app)
      .get('/api/v1/reports/profitability')
      .set('Authorization', farmer.token);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      farm_id: farm1Id,
      farm_name: 'Sunflower Fields',
      total_income: 14500,
      total_expense: 8000,
      net_profit: 6500,
    });
  });

  it('SE-5: denies Administrator and unauthenticated access to farmer dashboard and reports', async () => {
    const admin = await createAdmin();

    // Admin should get 403 Forbidden
    const adminDashRes = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', admin.token);
    expect(adminDashRes.status).toBe(403);

    const adminReportsRes = await request(app)
      .get('/api/v1/reports/profitability')
      .set('Authorization', admin.token);
    expect(adminReportsRes.status).toBe(403);

    // Unauthenticated should get 401 Unauthenticated
    const anonDashRes = await request(app).get('/api/v1/dashboard');
    expect(anonDashRes.status).toBe(401);

    const anonReportsRes = await request(app).get('/api/v1/reports/profitability');
    expect(anonReportsRes.status).toBe(401);
  });
});
