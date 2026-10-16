import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as userRepository from '../../src/repositories/userRepository.js';
import { createTestApp } from '../helpers/createTestApp.js';
import { FakeWeatherService } from '../helpers/FakeWeatherService.js';
import { createFixedClock } from '../helpers/fixedClock.js';

describe('Weather Dashboard, Alerts & Crop Advisory Integration (Feature 4)', () => {
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
    if (db) await db.close();
  });

  // Helpers to set up farmers, admin, farms, crops
  async function createFarmerWithFarmAndCrop(email, farmName = 'Sunny Fields', cropName = 'Wheat') {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Farmer Joe',
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
        area: 10.0,
      });

    const farmId = farmRes.body.data.farm_id;

    const cropRes = await request(app)
      .post(`/api/v1/farms/${farmId}/crops`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        crop_name: cropName,
        sowing_date: '2026-04-01',
        harvest_date: '2026-06-01',
        growth_stage: 'Vegetative',
      });

    const cropId = cropRes.body.data.crop_id;

    return { token, farmId, cropId, user: dbUser };
  }

  async function createAdminUser(email = 'admin@agriassist.local') {
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

    return `bearer-${fbUser.uid}`;
  }


  describe('Weather.Fetch & Weather.Display: Current Weather', () => {
    it('Weather.Fetch: returns current weather for authorized farm', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer1@test.com');

      const res = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        farm_id: farmId,
        type: 'current',
        temperature: 24.5,
        humidity: 65,
        condition: 'Mainly clear',
      });
      expect(res.body.data.stale).toBeUndefined();
    });

    it('Weather.Cache: reuses cached weather within 30-minute TTL (D16)', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer2@test.com');

      // First call fetches and stores in database
      const res1 = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);
      expect(res1.status).toBe(200);
      const firstFetchedAt = res1.body.data.fetched_at;

      // Advance clock by 10 minutes (within 30-min TTL)
      clock.advance(10 * 60 * 1000);

      // Mutate the mock service to return different data if called
      weatherService.currentData.temperature = 99.9;

      const res2 = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).toBe(200);
      // Still returns cached temperature and identical fetched_at
      expect(res2.body.data.temperature).toBe(24.5);
      expect(res2.body.data.fetched_at).toBe(firstFetchedAt);
    });

    it('Weather.Cache: fetches new data after 30-minute TTL expires', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer3@test.com');

      const res1 = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);
      expect(res1.status).toBe(200);

      // Advance clock by 31 minutes (exceeds 30-minute TTL)
      clock.advance(31 * 60 * 1000);

      weatherService.currentData.temperature = 32.0;

      const res2 = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.temperature).toBe(32.0);
      expect(new Date(res2.body.data.fetched_at).getTime()).toBeGreaterThan(
        new Date(res1.body.data.fetched_at).getTime()
      );
    });

    it('Weather.Fetch: falls back to stale cache with stale: true if upstream fails (D16)', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer4@test.com');

      // Initial successful fetch
      await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);

      // Advance clock beyond TTL
      clock.advance(45 * 60 * 1000);

      // Simulate upstream outage
      weatherService.failWeather = true;

      const res = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.temperature).toBe(24.5);
      expect(res.body.data.stale).toBe(true);
    });

    it('Weather.Fetch: returns 502 WEATHER_UNAVAILABLE when upstream fails and no cache exists', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer5@test.com');

      weatherService.failWeather = true;

      const res = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('WEATHER_UNAVAILABLE');
    });

    it('Weather.Fetch: administrator can view weather for any farm (D6)', async () => {
      const { farmId } = await createFarmerWithFarmAndCrop('farmer6@test.com');
      const adminToken = await createAdminUser();

      const res = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.farm_id).toBe(farmId);
    });

    it('Weather.Fetch: denies access with 403 if farmer does not own the farm (SE-5)', async () => {
      const userA = await createFarmerWithFarmAndCrop('farmerA@test.com');
      const userB = await createFarmerWithFarmAndCrop('farmerB@test.com');

      const res = await request(app)
        .get(`/api/v1/farms/${userA.farmId}/weather/current`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Weather.Fetch: returns 404 for non-existent farm', async () => {
      const { token } = await createFarmerWithFarmAndCrop('farmer7@test.com');

      const res = await request(app)
        .get(`/api/v1/farms/99999/weather/current`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FARM_NOT_FOUND');
    });
  });

  describe('Weather.Fetch & Weather.Display: Forecast', () => {
    it('Weather.Fetch: returns 7-day forecast by default', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer8@test.com');

      const res = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/forecast`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(7);
      expect(res.body.data[0].type).toBe('forecast');
    });

    it('Weather.Fetch: supports days query param for 5 and 6 days (D17)', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer9@test.com');

      const res5 = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/forecast?days=5`)
        .set('Authorization', `Bearer ${token}`);
      expect(res5.status).toBe(200);
      expect(res5.body.data).toHaveLength(5);

      const res6 = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/forecast?days=6`)
        .set('Authorization', `Bearer ${token}`);
      expect(res6.status).toBe(200);
      expect(res6.body.data).toHaveLength(6);
    });

    it('Weather.Fetch: rejects invalid days with 400 validation error', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer10@test.com');

      const resInvalid = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/forecast?days=4`)
        .set('Authorization', `Bearer ${token}`);

      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Weather Alert Notification: Alerts Endpoint', () => {
    it('Weather.Alert: returns empty array when no severe weather triggers (D12)', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer11@test.com');

      const res = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/alerts`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('Weather.Alert: returns alerts when high wind and heavy rain are forecasted in next 3 days', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer12@test.com');

      // Inject severe forecast into fake
      weatherService.forecastData = [
        {
          date: '2026-04-15',
          temperature: 24,
          temperature_max: 30,
          temperature_min: 18,
          humidity: 60,
          rainfall: 60.0, // >= 50 HEAVY_RAIN
          rainfall_probability: 90,
          wind_speed: 55.0, // >= 50 HIGH_WIND
          weather_code: 95, // THUNDERSTORM
          condition: 'Thunderstorm',
          forecast: 'Thunderstorm',
        },
      ];

      const res = await request(app)
        .get(`/api/v1/farms/${farmId}/weather/alerts`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      const types = res.body.data.map((a) => a.alert_type);
      expect(types).toContain('HIGH_WIND');
      expect(types).toContain('HEAVY_RAIN');
      expect(types).toContain('THUNDERSTORM');
      expect(res.body.data[0].severity).toBe('severe');
    });
  });

  describe('Advisory.Generate & Advisory.Display (Sequence Diagram 1)', () => {
    it('Advisory.Generate: generates crop advisory using latest weather and saves links (BR-4)', async () => {
      const { token, cropId } = await createFarmerWithFarmAndCrop('farmer13@test.com');

      const res = await request(app)
        .post(`/api/v1/crops/${cropId}/advisories`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        crop_id: cropId,
        recommendation: expect.any(String),
        message: expect.any(String),
        date: expect.any(String),
      });

      // Verify that advisory_weather junction rows were created in DB
      const junctionRows = await db.all(
        'SELECT * FROM advisory_weather WHERE advisory_id = ?',
        [res.body.data.advisory_id]
      );
      expect(junctionRows.length).toBeGreaterThanOrEqual(1);
    });

    it('Advisory.Generate: denies admin from generating advisory with 403 (D6)', async () => {
      const { cropId } = await createFarmerWithFarmAndCrop('farmer14@test.com');
      const adminToken = await createAdminUser();

      const res = await request(app)
        .post(`/api/v1/crops/${cropId}/advisories`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Advisory.Generate: denies farmer from generating advisory for another farmer crop (SE-5)', async () => {
      const userA = await createFarmerWithFarmAndCrop('farmer15A@test.com');
      const userB = await createFarmerWithFarmAndCrop('farmer15B@test.com');

      const res = await request(app)
        .post(`/api/v1/crops/${userA.cropId}/advisories`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Advisory.Display: returns advisory history and latest advisory', async () => {
      const { token, cropId } = await createFarmerWithFarmAndCrop('farmer16@test.com');

      // Generate two advisories
      await request(app)
        .post(`/api/v1/crops/${cropId}/advisories`)
        .set('Authorization', `Bearer ${token}`);

      clock.advance(5 * 60 * 1000);

      await request(app)
        .post(`/api/v1/crops/${cropId}/advisories`)
        .set('Authorization', `Bearer ${token}`);

      // GET list
      const listRes = await request(app)
        .get(`/api/v1/crops/${cropId}/advisories`)
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(2);
      expect(listRes.body.data[0].advisory_id).toBeGreaterThan(listRes.body.data[1].advisory_id);

      // GET latest
      const latestRes = await request(app)
        .get(`/api/v1/crops/${cropId}/advisories/latest`)
        .set('Authorization', `Bearer ${token}`);

      expect(latestRes.status).toBe(200);
      expect(latestRes.body.data.advisory_id).toBe(listRes.body.data[0].advisory_id);
    });

    it('Advisory.Display: returns 404 for latest advisory when none exist', async () => {
      const { token, cropId } = await createFarmerWithFarmAndCrop('farmer17@test.com');

      const res = await request(app)
        .get(`/api/v1/crops/${cropId}/advisories/latest`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('Advisory.Display: admin can view crop advisories (Section 12.6)', async () => {
      const { token, cropId } = await createFarmerWithFarmAndCrop('farmer18@test.com');
      const adminToken = await createAdminUser();

      await request(app)
        .post(`/api/v1/crops/${cropId}/advisories`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .get(`/api/v1/crops/${cropId}/advisories`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Cascade Deletes: Farm and Crop deletes remove weather and advisory records (D5)', () => {
    it('Cascade: deleting a crop cascades and deletes its advisories and junction rows', async () => {
      const { token, cropId } = await createFarmerWithFarmAndCrop('farmer19@test.com');

      const advRes = await request(app)
        .post(`/api/v1/crops/${cropId}/advisories`)
        .set('Authorization', `Bearer ${token}`);
      const advisoryId = advRes.body.data.advisory_id;

      // Delete crop
      const delRes = await request(app)
        .delete(`/api/v1/crops/${cropId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(200);

      // Verify advisory and junction rows are gone
      const advRow = await db.get('SELECT * FROM crop_advisories WHERE advisory_id = ?', [advisoryId]);
      expect(advRow).toBeUndefined();

      const juncRows = await db.all('SELECT * FROM advisory_weather WHERE advisory_id = ?', [advisoryId]);
      expect(juncRows).toHaveLength(0);
    });

    it('Cascade: deleting a farm cascades and deletes its weather_data rows', async () => {
      const { token, farmId } = await createFarmerWithFarmAndCrop('farmer20@test.com');

      // Fetch weather to populate weather_data rows
      await request(app)
        .get(`/api/v1/farms/${farmId}/weather/current`)
        .set('Authorization', `Bearer ${token}`);

      const weatherRowsBefore = await db.all('SELECT * FROM weather_data WHERE farm_id = ?', [farmId]);
      expect(weatherRowsBefore.length).toBeGreaterThan(0);

      // Delete farm
      const delRes = await request(app)
        .delete(`/api/v1/farms/${farmId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(200);

      const weatherRowsAfter = await db.all('SELECT * FROM weather_data WHERE farm_id = ?', [farmId]);
      expect(weatherRowsAfter).toHaveLength(0);
    });
  });
});
