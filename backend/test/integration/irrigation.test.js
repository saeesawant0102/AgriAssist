import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startScheduler, stopScheduler } from '../../src/jobs/scheduler.js';
import * as userRepository from '../../src/repositories/userRepository.js';
import { IrrigationService } from '../../src/services/irrigationService.js';
import { createTestApp } from '../helpers/createTestApp.js';
import { FakeWeatherService } from '../helpers/FakeWeatherService.js';
import { createFixedClock } from '../helpers/fixedClock.js';

describe('Irrigation Scheduling Integration (Feature 5)', () => {
  let app;
  let db;
  let authGateway;
  let weatherService;
  let clock;

  beforeEach(async () => {
    weatherService = new FakeWeatherService();
    clock = createFixedClock('2026-04-15T10:00:00.000Z');

    const testApp = await createTestApp({
      weatherService,
      clock,
      geocoder: async () => ({ latitude: 18.5204, longitude: 73.8567, name: 'Pune' }),
    });

    app = testApp.app;
    db = testApp.db;
    authGateway = testApp.authGateway;
  });

  afterEach(async () => {
    stopScheduler();
    if (db) await db.close();
  });

  async function createFarmerWithCrop(email, farmName = 'Green Valley', cropName = 'Wheat') {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Farmer John',
      email,
      password: 'Password123',
    });
    const dbUser = await userRepository.findUserByEmail(db, email);
    const token = `bearer-${dbUser.firebase_uid}`;

    const farmRes = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        farm_name: farmName,
        location: 'Pune, Maharashtra',
        area: 12.5,
      });

    const farmId = farmRes.body.data.farm_id;

    const cropRes = await request(app)
      .post(`/api/v1/farms/${farmId}/crops`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        crop_name: cropName,
        sowing_date: '2026-04-01',
      });

    const cropId = cropRes.body.data.crop_id;
    return { token, dbUser, farmId, cropId };
  }

  async function createAdmin(email = 'admin@agriassist.test') {
    const fbUser = await authGateway.createUser({
      email,
      password: 'AdminPassword123',
      displayName: 'System Admin',
    });

    const nowIso = new Date().toISOString();
    await db.transaction(async (tx) => {
      const userId = await userRepository.createUser(tx, {
        firebase_uid: fbUser.uid,
        user_type: 'administrator',
        name: 'System Admin',
        email,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });
      await userRepository.createAdministrator(tx, {
        user_id: userId,
        role: 'system_admin',
      });
    });

    const token = `bearer-${fbUser.uid}`;
    return { token };
  }

  it('Irrigation.Generate: creates an irrigation schedule using default requirements for dry forecast', async () => {
    const { token, cropId } = await createFarmerWithCrop('farmer1@test.com');

    // Dry forecast with low rain probability
    weatherService.forecastData = [
      { date: '2026-04-15', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-16', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-17', rainfall: 0, rainfall_probability: 15, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-18', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-19', rainfall: 0, rainfall_probability: 5, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-20', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-21', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
    ];

    const res = await request(app)
      .post(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    const schedule = res.body.data;
    expect(schedule.crop_id).toBe(cropId);
    expect(schedule.start_date).toBe('2026-04-15');
    expect(schedule.end_date).toBe('2026-04-21');
    expect(schedule.frequency).toBe('Every 5 days');
    expect(schedule.water_required).toBe('25 mm per irrigation');
    expect(schedule.skip_recommended).toBe(0);
    expect(schedule.note).toBe('');
    expect(schedule.irrigation_dates).toEqual(['2026-04-15', '2026-04-20']);
    expect(schedule.skipped_dates).toEqual([]);

    // Check DB rows
    const dbDates = await db.all(
      `SELECT * FROM irrigation_schedule_dates WHERE schedule_id = ? ORDER BY date ASC`,
      [schedule.schedule_id]
    );
    expect(dbDates).toHaveLength(2);
    expect(dbDates[0].is_skipped).toBe(0);
    expect(dbDates[1].is_skipped).toBe(0);
  });

  it('Irrigation.Skip: recommends skip and generates note when candidate date meets rainy threshold', async () => {
    const { token, cropId } = await createFarmerWithCrop('farmer2@test.com');

    // Forecast where D[5] (2026-04-20) has rainfall >= 5 mm
    weatherService.forecastData = [
      { date: '2026-04-15', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-16', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-17', rainfall: 0, rainfall_probability: 15, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-18', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-19', rainfall: 0, rainfall_probability: 5, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-20', rainfall: 8.5, rainfall_probability: 45, temperature_max: 27, temperature_min: 19 }, // Rainy candidate
      { date: '2026-04-21', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
    ];

    const res = await request(app)
      .post(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    const schedule = res.body.data;
    expect(schedule.skip_recommended).toBe(1);
    expect(schedule.irrigation_dates).toEqual(['2026-04-15']);
    expect(schedule.skipped_dates).toEqual(['2026-04-20']);
    expect(schedule.note).toBe('Rainfall expected on 2026-04-20; skip irrigation on these dates.');
  });

  it('Irrigation.View: lists schedules for a crop in descending order', async () => {
    const { token, cropId } = await createFarmerWithCrop('farmer3@test.com');

    await request(app)
      .post(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].irrigation_dates).toBeDefined();
    expect(res.body.data[0].skipped_dates).toBeDefined();
  });

  it('Irrigation.Update: refreshes an existing schedule in-place without creating duplicate rows', async () => {
    const { token, cropId } = await createFarmerWithCrop('farmer4@test.com');

    // Create initial schedule with dry weather
    weatherService.forecastData = [
      { date: '2026-04-15', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-16', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-17', rainfall: 0, rainfall_probability: 15, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-18', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-19', rainfall: 0, rainfall_probability: 5, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-20', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
      { date: '2026-04-21', rainfall: 0, rainfall_probability: 10, temperature_max: 30, temperature_min: 20 },
    ];

    const createRes = await request(app)
      .post(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${token}`);

    const initialSchedule = createRes.body.data;
    expect(initialSchedule.skip_recommended).toBe(0);

    // Weather forecast changes: D[5] now has 70% rain probability
    weatherService.forecastData[5] = {
      date: '2026-04-20',
      rainfall: 1.0,
      rainfall_probability: 70,
      temperature_max: 26,
      temperature_min: 18,
    };

    // Advance clock by 35 minutes to bypass 30-min cache
    clock.advance(35 * 60 * 1000);

    const refreshRes = await request(app)
      .post(`/api/v1/irrigation-schedules/${initialSchedule.schedule_id}/refresh`)
      .set('Authorization', `Bearer ${token}`);

    expect(refreshRes.status).toBe(200);
    const refreshed = refreshRes.body.data;
    // Same schedule row updated in-place
    expect(refreshed.schedule_id).toBe(initialSchedule.schedule_id);
    expect(refreshed.skip_recommended).toBe(1);
    expect(refreshed.skipped_dates).toEqual(['2026-04-20']);
    expect(refreshed.updated_at).not.toBe(initialSchedule.created_at);

    // Verify row count in DB remains 1
    const totalSchedules = await db.all(
      `SELECT * FROM irrigation_schedules WHERE crop_id = ?`,
      [cropId]
    );
    expect(totalSchedules).toHaveLength(1);
  });

  it('SE-5: denies cross-owner access and operations on foreign crop schedules', async () => {
    const farmer1 = await createFarmerWithCrop('owner1@test.com');
    const farmer2 = await createFarmerWithCrop('owner2@test.com');

    // Create schedule for farmer1
    const createRes = await request(app)
      .post(`/api/v1/crops/${farmer1.cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${farmer1.token}`);
    const schedId = createRes.body.data.schedule_id;

    // Farmer2 attempts to generate schedule on farmer1's crop -> 403
    const foreignGen = await request(app)
      .post(`/api/v1/crops/${farmer1.cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${farmer2.token}`);
    expect(foreignGen.status).toBe(403);

    // Farmer2 attempts to view farmer1's schedules -> 403
    const foreignView = await request(app)
      .get(`/api/v1/crops/${farmer1.cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${farmer2.token}`);
    expect(foreignView.status).toBe(403);

    // Farmer2 attempts to refresh farmer1's schedule -> 403
    const foreignRefresh = await request(app)
      .post(`/api/v1/irrigation-schedules/${schedId}/refresh`)
      .set('Authorization', `Bearer ${farmer2.token}`);
    expect(foreignRefresh.status).toBe(403);
  });

  it('Section 12.7: allows Admin to view schedules, but forbids Admin from generating or refreshing', async () => {
    const { token: farmerToken, cropId } = await createFarmerWithCrop('farmer_admin_test@test.com');
    const { token: adminToken } = await createAdmin();

    const createRes = await request(app)
      .post(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${farmerToken}`);
    const schedId = createRes.body.data.schedule_id;

    // Admin view allowed
    const adminView = await request(app)
      .get(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminView.status).toBe(200);

    // Admin generate forbidden
    const adminGen = await request(app)
      .post(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminGen.status).toBe(403);

    // Admin refresh forbidden
    const adminRefresh = await request(app)
      .post(`/api/v1/irrigation-schedules/${schedId}/refresh`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRefresh.status).toBe(403);
  });

  it('D5: cascade delete crop removes irrigation schedule, dates, and weather associations', async () => {
    const { token, cropId } = await createFarmerWithCrop('cascade_farmer@test.com');

    const genRes = await request(app)
      .post(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${token}`);
    const schedId = genRes.body.data.schedule_id;

    // Verify DB records exist
    const schedBefore = await db.get(
      `SELECT * FROM irrigation_schedules WHERE schedule_id = ?`,
      [schedId]
    );
    expect(schedBefore).toBeDefined();

    // Delete crop
    const delRes = await request(app)
      .delete(`/api/v1/crops/${cropId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    // Verify cascades deleted schedule, dates, and schedule_weather
    const schedAfter = await db.get(
      `SELECT * FROM irrigation_schedules WHERE schedule_id = ?`,
      [schedId]
    );
    expect(schedAfter).toBeUndefined();

    const datesAfter = await db.all(
      `SELECT * FROM irrigation_schedule_dates WHERE schedule_id = ?`,
      [schedId]
    );
    expect(datesAfter).toHaveLength(0);

    const weatherAfter = await db.all(
      `SELECT * FROM schedule_weather WHERE schedule_id = ?`,
      [schedId]
    );
    expect(weatherAfter).toHaveLength(0);
  });

  it('D18: refreshActiveSchedules refreshes non-expired schedules and batches requests by farm', async () => {
    const { token, cropId, _farmId } = await createFarmerWithCrop('cron_farmer@test.com');

    // Create schedule
    await request(app)
      .post(`/api/v1/crops/${cropId}/irrigation-schedules`)
      .set('Authorization', `Bearer ${token}`);

    const service = new IrrigationService({ db, weatherService, clock });

    // Test refresh function
    const result = await service.refreshActiveSchedules();
    expect(result.refreshedCount).toBe(1);
    expect(result.farmCount).toBe(1);

    // Verify an expired schedule is not refreshed
    await db.run(
      `UPDATE irrigation_schedules SET end_date = '2026-04-10' WHERE crop_id = ?`,
      [cropId]
    );
    const resultExpired = await service.refreshActiveSchedules();
    expect(resultExpired.refreshedCount).toBe(0);
  });

  it('D18: scheduler prevents duplicate registration and manages active tasks', () => {
    stopScheduler();
    const tasks1 = startScheduler({ db, weatherService, clock });
    expect(tasks1.length).toBe(1);

    // Second call should return existing tasks without registering new ones
    const tasks2 = startScheduler({ db, weatherService, clock });
    expect(tasks2.length).toBe(1);

    stopScheduler();
  });
});
