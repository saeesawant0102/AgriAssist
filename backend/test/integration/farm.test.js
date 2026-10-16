import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors/AppError.js';
import * as userRepository from '../../src/repositories/userRepository.js';
import { createTestApp } from '../helpers/createTestApp.js';

describe('Farm Management Integration (Feature 2)', () => {
  let app;
  let db;
  let authGateway;
  let geocoderCalls = [];
  let mockGeocoder;

  beforeEach(async () => {
    geocoderCalls = [];
    mockGeocoder = async (location) => {
      geocoderCalls.push(location);
      if (location === 'UnknownLand') {
        throw AppError.locationNotFound(`Location "${location}" could not be geocoded`);
      }
      if (location === 'DownStreamError') {
        throw AppError.weatherUnavailable('Geocoding request timed out');
      }
      if (location === 'Nashik') {
        return { latitude: 19.9975, longitude: 73.7898, name: 'Nashik' };
      }
      return { latitude: 18.5204, longitude: 73.8567, name: 'Pune' };
    };

    const testApp = await createTestApp({
      geocoder: mockGeocoder,
    });
    app = testApp.app;
    db = testApp.db;
    authGateway = testApp.authGateway;
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  // Helper to create a farmer and return token & profile
  async function createFarmer(email, name = 'Test Farmer') {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name,
      email,
      password: 'Password123',
    });
    const dbUser = await userRepository.findUserByEmail(db, email);
    const token = `bearer-${dbUser.firebase_uid}`;
    return { token, farmer_id: regRes.body.data.farmer_id, user_id: dbUser.user_id };
  }

  // Helper to create an admin and return token
  async function createAdmin(email = 'admin@example.com', name = 'System Admin') {
    const fbUser = await authGateway.createUser({
      email,
      password: 'AdminPassword123',
      displayName: name,
    });
    const nowIso = new Date().toISOString();
    await db.transaction(async (tx) => {
      const userId = await userRepository.createUser(tx, {
        firebase_uid: fbUser.uid,
        user_type: 'administrator',
        name,
        email,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });
      await userRepository.createAdministrator(tx, {
        user_id: userId,
        role: 'superadmin',
      });
    });
    return { token: `bearer-${fbUser.uid}` };
  }

  it('Farm.Add: farmer adds farm with geocoding fallback and trigger increments farm_count', async () => {
    const farmer = await createFarmer('farmer1@example.com', 'Farmer One');

    const payload = {
      farm_name: 'Green Valley Farm',
      location: 'Pune, Maharashtra',
      area: 15.5,
    };

    const res = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.farm_id).toBeDefined();
    expect(res.body.data.farmer_id).toBe(farmer.farmer_id);
    expect(res.body.data.farm_name).toBe('Green Valley Farm');
    expect(res.body.data.location).toBe('Pune, Maharashtra');
    expect(res.body.data.area).toBe(15.5);
    expect(res.body.data.latitude).toBe(18.5204);
    expect(res.body.data.longitude).toBe(73.8567);
    expect(geocoderCalls).toContain('Pune, Maharashtra');

    // Requirement: Trigger trg_farms_after_insert increments farmers.farm_count
    const farmerRow = await db.get('SELECT farm_count FROM farmers WHERE farmer_id = ?', [
      farmer.farmer_id,
    ]);
    expect(farmerRow.farm_count).toBe(1);
  });

  it('Farm.Add: explicit coordinates bypass geocoding', async () => {
    const farmer = await createFarmer('farmer2@example.com', 'Farmer Two');

    const payload = {
      farm_name: 'Coastal Fields',
      location: 'Mumbai Suburbs',
      area: 25.0,
      latitude: 19.076,
      longitude: 72.8777,
    };

    const res = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.latitude).toBe(19.076);
    expect(res.body.data.longitude).toBe(72.8777);
    expect(geocoderCalls).toHaveLength(0);
  });

  it('Farm.Add: returns 400 LOCATION_NOT_FOUND when geocoding cannot find location', async () => {
    const farmer = await createFarmer('farmer3@example.com');

    const res = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        farm_name: 'Fairy Farm',
        location: 'UnknownLand',
        area: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LOCATION_NOT_FOUND');
  });

  it('Farm.Add: returns 502 WEATHER_UNAVAILABLE when geocoding upstream service fails', async () => {
    const farmer = await createFarmer('farmer4@example.com');

    const res = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        farm_name: 'Cloud Farm',
        location: 'DownStreamError',
        area: 10,
      });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('WEATHER_UNAVAILABLE');
  });

  it('Farm.Validate: rejects area <= 0 with 400 VALIDATION_ERROR', async () => {
    const farmer = await createFarmer('farmer5@example.com');

    const resZero = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        farm_name: 'Zero Area Farm',
        location: 'Pune',
        area: 0,
      });

    expect(resZero.status).toBe(400);
    expect(resZero.body.error.code).toBe('VALIDATION_ERROR');

    const resNegative = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        farm_name: 'Negative Area Farm',
        location: 'Pune',
        area: -5,
      });

    expect(resNegative.status).toBe(400);
    expect(resNegative.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('BR-1: SQLite CHECK constraint enforces area > 0', async () => {
    const farmer = await createFarmer('farmer6@example.com');

    await expect(
      db.run(
        `INSERT INTO farms (farmer_id, farm_name, location, area, latitude, longitude, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [farmer.farmer_id, 'Check Farm', 'Pune', 0, 18.5, 73.8, new Date().toISOString(), new Date().toISOString()]
      )
    ).rejects.toThrow();
  });

  it('Farm.Add: admin adds farm on behalf of existing farmer', async () => {
    const admin = await createAdmin('admin1@example.com');
    const farmer = await createFarmer('targetfarmer@example.com', 'Target Farmer');

    const res = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        farmer_id: farmer.farmer_id,
        farm_name: 'Admin Added Farm',
        location: 'Pune',
        area: 50,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.farmer_id).toBe(farmer.farmer_id);
    expect(res.body.data.farm_name).toBe('Admin Added Farm');

    const farmerRow = await db.get('SELECT farm_count FROM farmers WHERE farmer_id = ?', [
      farmer.farmer_id,
    ]);
    expect(farmerRow.farm_count).toBe(1);
  });

  it('Farm.Add: admin receives 404 when target farmer does not exist', async () => {
    const admin = await createAdmin('admin2@example.com');

    const res = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        farmer_id: 99999,
        farm_name: 'Ghost Farm',
        location: 'Pune',
        area: 50,
      });

    expect(res.status).toBe(404);
  });

  it('Farm.View: farmer lists only own farms, single farm, and gets 403 on cross-farmer access', async () => {
    const farmerA = await createFarmer('farmerA@example.com', 'Farmer A');
    const farmerB = await createFarmer('farmerB@example.com', 'Farmer B');

    // Create 2 farms for A
    const farmA1 = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmerA.token}`)
      .send({ farm_name: 'Farm A1', location: 'Pune', area: 10 });
    await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmerA.token}`)
      .send({ farm_name: 'Farm A2', location: 'Pune', area: 20 });

    // Create 1 farm for B
    const farmB1 = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmerB.token}`)
      .send({ farm_name: 'Farm B1', location: 'Pune', area: 30 });

    // Farmer A list
    const listResA = await request(app)
      .get('/api/v1/farms')
      .set('Authorization', `Bearer ${farmerA.token}`);
    expect(listResA.status).toBe(200);
    expect(listResA.body.data).toHaveLength(2);
    expect(listResA.body.data.map((f) => f.farm_name)).toEqual(['Farm A1', 'Farm A2']);

    // Farmer A view own farm
    const viewResA1 = await request(app)
      .get(`/api/v1/farms/${farmA1.body.data.farm_id}`)
      .set('Authorization', `Bearer ${farmerA.token}`);
    expect(viewResA1.status).toBe(200);
    expect(viewResA1.body.data.farm_name).toBe('Farm A1');

    // Requirement: SE-5 - Farmer A attempt to view Farmer B's farm returns 403 FORBIDDEN
    const crossRes = await request(app)
      .get(`/api/v1/farms/${farmB1.body.data.farm_id}`)
      .set('Authorization', `Bearer ${farmerA.token}`);
    expect(crossRes.status).toBe(403);
    expect(crossRes.body.error.code).toBe('FORBIDDEN');
  });

  it('Farm.View: admin lists all farms and filters by farmer_id', async () => {
    const admin = await createAdmin('adminview@example.com');
    const farmerA = await createFarmer('farmerAv@example.com');
    const farmerB = await createFarmer('farmerBv@example.com');

    await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmerA.token}`)
      .send({ farm_name: 'Farm A', location: 'Pune', area: 10 });
    await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmerB.token}`)
      .send({ farm_name: 'Farm B', location: 'Pune', area: 20 });

    // Admin view all
    const allRes = await request(app)
      .get('/api/v1/farms')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data).toHaveLength(2);

    // Admin filter by farmer_id
    const filterRes = await request(app)
      .get(`/api/v1/farms?farmer_id=${farmerA.farmer_id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data).toHaveLength(1);
    expect(filterRes.body.data[0].farm_name).toBe('Farm A');
  });

  it('Farm.Edit: farmer edits farm and re-geocodes on location change', async () => {
    const farmer = await createFarmer('farmeredit@example.com');
    const addRes = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ farm_name: 'Original Farm', location: 'Pune', area: 10 });

    const farmId = addRes.body.data.farm_id;
    geocoderCalls = [];

    const editRes = await request(app)
      .put(`/api/v1/farms/${farmId}`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        farm_name: 'Renamed Farm',
        location: 'Nashik',
        area: 18.5,
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.farm_name).toBe('Renamed Farm');
    expect(editRes.body.data.location).toBe('Nashik');
    expect(editRes.body.data.area).toBe(18.5);
    expect(editRes.body.data.latitude).toBe(19.9975);
    expect(editRes.body.data.longitude).toBe(73.7898);
    expect(geocoderCalls).toContain('Nashik');
  });

  it('D6: admin attempting to edit a farm returns 403 FORBIDDEN', async () => {
    const admin = await createAdmin('adminedit@example.com');
    const farmer = await createFarmer('farmerforadmin@example.com');
    const addRes = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ farm_name: 'Farm Test', location: 'Pune', area: 10 });

    const farmId = addRes.body.data.farm_id;

    const editRes = await request(app)
      .put(`/api/v1/farms/${farmId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ farm_name: 'Hacked Name' });

    expect(editRes.status).toBe(403);
    expect(editRes.body.error.code).toBe('FORBIDDEN');
  });

  it('Farm.Delete: farmer deletes own farm and trigger decrements farm_count', async () => {
    const farmer = await createFarmer('farmerdel@example.com');
    const addRes = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ farm_name: 'Farm to Delete', location: 'Pune', area: 10 });

    const farmId = addRes.body.data.farm_id;

    // Check count is 1
    let farmerRow = await db.get('SELECT farm_count FROM farmers WHERE farmer_id = ?', [
      farmer.farmer_id,
    ]);
    expect(farmerRow.farm_count).toBe(1);

    const delRes = await request(app)
      .delete(`/api/v1/farms/${farmId}`)
      .set('Authorization', `Bearer ${farmer.token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deleted).toBe(true);

    // Requirement: Trigger trg_farms_after_delete decrements farm_count
    farmerRow = await db.get('SELECT farm_count FROM farmers WHERE farmer_id = ?', [
      farmer.farmer_id,
    ]);
    expect(farmerRow.farm_count).toBe(0);

    // Farm is gone
    const viewRes = await request(app)
      .get(`/api/v1/farms/${farmId}`)
      .set('Authorization', `Bearer ${farmer.token}`);
    expect(viewRes.status).toBe(404);
  });

  it('D6: admin can delete any farm and trigger decrements farm_count', async () => {
    const admin = await createAdmin('admindel@example.com');
    const farmer = await createFarmer('farmeradmindel@example.com');

    const addRes = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ farm_name: 'Farm for Admin Delete', location: 'Pune', area: 12 });

    const farmId = addRes.body.data.farm_id;

    const delRes = await request(app)
      .delete(`/api/v1/farms/${farmId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deleted).toBe(true);

    const farmerRow = await db.get('SELECT farm_count FROM farmers WHERE farmer_id = ?', [
      farmer.farmer_id,
    ]);
    expect(farmerRow.farm_count).toBe(0);
  });

  it('SE-5: farmer attempting to delete another farmer farm returns 403 FORBIDDEN', async () => {
    const farmerA = await createFarmer('farmerAdel@example.com');
    const farmerB = await createFarmer('farmerBdel@example.com');

    const addRes = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${farmerB.token}`)
      .send({ farm_name: 'Farmer B Farm', location: 'Pune', area: 10 });

    const farmId = addRes.body.data.farm_id;

    const delRes = await request(app)
      .delete(`/api/v1/farms/${farmId}`)
      .set('Authorization', `Bearer ${farmerA.token}`);

    expect(delRes.status).toBe(403);
    expect(delRes.body.error.code).toBe('FORBIDDEN');
  });
});
