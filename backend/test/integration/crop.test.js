import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as userRepository from '../../src/repositories/userRepository.js';
import { createTestApp } from '../helpers/createTestApp.js';

describe('Crop Management Integration (Feature 3)', () => {
  let app;
  let db;
  let authGateway;

  beforeEach(async () => {
    const testApp = await createTestApp({
      geocoder: async () => ({ latitude: 18.5204, longitude: 73.8567, name: 'Pune' }),
    });
    app = testApp.app;
    db = testApp.db;
    authGateway = testApp.authGateway;
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  // Helper to create a farmer with a farm
  async function createFarmerWithFarm(email, farmName = 'Green Acres') {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Farmer User',
      email,
      password: 'Password123',
    });
    const dbUser = await userRepository.findUserByEmail(db, email);
    const token = `bearer-${dbUser.firebase_uid}`;
    const farmer_id = regRes.body.data.farmer_id;

    const farmRes = await request(app)
      .post('/api/v1/farms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        farm_name: farmName,
        location: 'Pune, Maharashtra',
        area: 12.5,
      });

    return {
      token,
      farmer_id,
      farm_id: farmRes.body.data.farm_id,
    };
  }

  // Helper to create an administrator
  async function createAdmin(email = 'admin@example.com') {
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
        role: 'superadmin',
      });
    });
    return { token: `bearer-${fbUser.uid}` };
  }

  it('Crop.Add: farmer adds crop to own farm with default Sowing stage', async () => {
    const farmer = await createFarmerWithFarm('cropfarmer1@example.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        crop_name: 'Wheat',
        variety: 'Sharbati',
        sowing_date: '2026-11-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.crop_id).toBeDefined();
    expect(res.body.data.farm_id).toBe(farmer.farm_id);
    expect(res.body.data.crop_name).toBe('Wheat');
    expect(res.body.data.variety).toBe('Sharbati');
    expect(res.body.data.sowing_date).toBe('2026-11-01');
    expect(res.body.data.harvest_date).toBeNull();
    expect(res.body.data.growth_stage).toBe('Sowing');
  });

  it('Crop.Add: accepts valid harvest_date on or after sowing_date', async () => {
    const farmer = await createFarmerWithFarm('cropfarmer2@example.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        crop_name: 'Sugarcane',
        variety: 'Co 86032',
        sowing_date: '2026-02-15',
        harvest_date: '2026-12-20',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sowing_date).toBe('2026-02-15');
    expect(res.body.data.harvest_date).toBe('2026-12-20');
  });

  it('Crop.Validate: rejects harvest_date < sowing_date with 400 VALIDATION_ERROR', async () => {
    const farmer = await createFarmerWithFarm('cropfarmer3@example.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        crop_name: 'Invalid Crop',
        sowing_date: '2026-06-01',
        harvest_date: '2026-05-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.path?.includes('harvest_date'))).toBe(true);
  });

  it('BR-3: SQLite CHECK constraint rejects harvest_date < sowing_date', async () => {
    const farmer = await createFarmerWithFarm('cropfarmer4@example.com');

    await expect(
      db.run(
        `INSERT INTO crops (farm_id, crop_name, sowing_date, harvest_date, growth_stage, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          farmer.farm_id,
          'Direct DB Check Crop',
          '2026-06-01',
          '2026-05-01',
          'Sowing',
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      )
    ).rejects.toThrow();
  });

  it('SE-5: farmer attempting to add crop to another farmer farm returns 403 FORBIDDEN', async () => {
    const farmerA = await createFarmerWithFarm('farmerA@example.com');
    const farmerB = await createFarmerWithFarm('farmerB@example.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmerB.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmerA.token}`)
      .send({
        crop_name: 'Hijacked Crop',
        sowing_date: '2026-05-01',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('D6: admin attempting to add a crop returns 403 FORBIDDEN', async () => {
    const admin = await createAdmin('cropadmin1@example.com');
    const farmer = await createFarmerWithFarm('farmerforadmincrop@example.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        crop_name: 'Admin Crop',
        sowing_date: '2026-05-01',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Crop.View: farmer lists crops on own farm, and gets 403 on another farmer farm', async () => {
    const farmerA = await createFarmerWithFarm('farmerAview@example.com');
    const farmerB = await createFarmerWithFarm('farmerBview@example.com');

    await request(app)
      .post(`/api/v1/farms/${farmerA.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmerA.token}`)
      .send({ crop_name: 'Crop A1', sowing_date: '2026-03-01' });

    await request(app)
      .post(`/api/v1/farms/${farmerA.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmerA.token}`)
      .send({ crop_name: 'Crop A2', sowing_date: '2026-04-01' });

    // Farmer A views own crops
    const listRes = await request(app)
      .get(`/api/v1/farms/${farmerA.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmerA.token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(2);

    // Farmer B tries to view Farmer A's crops
    const forbiddenRes = await request(app)
      .get(`/api/v1/farms/${farmerA.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmerB.token}`);

    expect(forbiddenRes.status).toBe(403);
  });

  it('D6: admin can view crops on any farm', async () => {
    const admin = await createAdmin('cropadminview@example.com');
    const farmer = await createFarmerWithFarm('farmercropsadmin@example.com');

    await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Cotton', sowing_date: '2026-05-15' });

    const res = await request(app)
      .get(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].crop_name).toBe('Cotton');
  });

  it('Crop.View: retrieves single crop details by cropId', async () => {
    const farmer = await createFarmerWithFarm('cropsingle@example.com');

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Soybean', variety: 'JS 335', sowing_date: '2026-06-10' });

    const cropId = addRes.body.data.crop_id;

    const getRes = await request(app)
      .get(`/api/v1/crops/${cropId}`)
      .set('Authorization', `Bearer ${farmer.token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.crop_name).toBe('Soybean');
    expect(getRes.body.data.variety).toBe('JS 335');
  });

  it('Crop.Edit: updates crop details without modifying immutable farm_id (BR-3)', async () => {
    const farmer = await createFarmerWithFarm('cropedit@example.com');

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Chickpea', variety: 'Desi', sowing_date: '2026-10-01' });

    const cropId = addRes.body.data.crop_id;

    const editRes = await request(app)
      .put(`/api/v1/crops/${cropId}`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        crop_name: 'Bengal Gram',
        variety: 'Kabuli',
        farm_id: 99999, // Requirement BR-3: farm_id must be ignored and not changed
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.crop_name).toBe('Bengal Gram');
    expect(editRes.body.data.variety).toBe('Kabuli');
    expect(editRes.body.data.farm_id).toBe(farmer.farm_id); // Kept original

    const dbRow = await db.get('SELECT farm_id FROM crops WHERE crop_id = ?', [cropId]);
    expect(dbRow.farm_id).toBe(farmer.farm_id);
  });

  it('D6: admin attempting to edit a crop returns 403 FORBIDDEN', async () => {
    const admin = await createAdmin('cropadminedit@example.com');
    const farmer = await createFarmerWithFarm('cropeditfarmer@example.com');

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Onion', sowing_date: '2026-08-01' });

    const cropId = addRes.body.data.crop_id;

    const editRes = await request(app)
      .put(`/api/v1/crops/${cropId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ crop_name: 'Hacked Onion' });

    expect(editRes.status).toBe(403);
    expect(editRes.body.error.code).toBe('FORBIDDEN');
  });

  it('Crop.Stage.Update: updates growth stage to valid D3 stage', async () => {
    const farmer = await createFarmerWithFarm('cropstage@example.com');

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Maize', sowing_date: '2026-07-01' });

    const cropId = addRes.body.data.crop_id;

    // Transition to Flowering
    const stageRes = await request(app)
      .patch(`/api/v1/crops/${cropId}/stage`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ growth_stage: 'Flowering' });

    expect(stageRes.status).toBe(200);
    expect(stageRes.body.data.growth_stage).toBe('Flowering');

    const dbCrop = await db.get('SELECT growth_stage FROM crops WHERE crop_id = ?', [cropId]);
    expect(dbCrop.growth_stage).toBe('Flowering');
  });

  it('D3: rejects invalid growth stage with 400 VALIDATION_ERROR', async () => {
    const farmer = await createFarmerWithFarm('cropstageinvalid@example.com');

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Rice', sowing_date: '2026-06-01' });

    const cropId = addRes.body.data.crop_id;

    const res = await request(app)
      .patch(`/api/v1/crops/${cropId}/stage`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ growth_stage: 'ImaginaryStage' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('D6: admin attempting to update crop stage returns 403 FORBIDDEN', async () => {
    const admin = await createAdmin('cropadminstage@example.com');
    const farmer = await createFarmerWithFarm('cropadminstagef@example.com');

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Barley', sowing_date: '2026-07-01' });

    const cropId = addRes.body.data.crop_id;

    const res = await request(app)
      .patch(`/api/v1/crops/${cropId}/stage`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ growth_stage: 'Vegetative' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Crop.Delete: farmer deletes own crop and admin cannot delete crops', async () => {
    const admin = await createAdmin('cropdeladmin@example.com');
    const farmer = await createFarmerWithFarm('cropdel@example.com');

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Mustard', sowing_date: '2026-10-15' });

    const cropId = addRes.body.data.crop_id;

    // Admin attempt to delete crop returns 403
    const adminDel = await request(app)
      .delete(`/api/v1/crops/${cropId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(adminDel.status).toBe(403);

    // Farmer deletes own crop
    const farmerDel = await request(app)
      .delete(`/api/v1/crops/${cropId}`)
      .set('Authorization', `Bearer ${farmer.token}`);
    expect(farmerDel.status).toBe(200);
    expect(farmerDel.body.data.deleted).toBe(true);

    const getRes = await request(app)
      .get(`/api/v1/crops/${cropId}`)
      .set('Authorization', `Bearer ${farmer.token}`);
    expect(getRes.status).toBe(404);
  });

  it('D5: deleting a farm cascade deletes all associated crops', async () => {
    const farmer = await createFarmerWithFarm('farmcascade@example.com');

    await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Crop 1', sowing_date: '2026-05-01' });

    await request(app)
      .post(`/api/v1/farms/${farmer.farm_id}/crops`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ crop_name: 'Crop 2', sowing_date: '2026-06-01' });

    let cropsBefore = await db.all('SELECT * FROM crops WHERE farm_id = ?', [farmer.farm_id]);
    expect(cropsBefore).toHaveLength(2);

    // Delete farm
    const delFarm = await request(app)
      .delete(`/api/v1/farms/${farmer.farm_id}`)
      .set('Authorization', `Bearer ${farmer.token}`);
    expect(delFarm.status).toBe(200);

    // Foreign key cascade check
    let cropsAfter = await db.all('SELECT * FROM crops WHERE farm_id = ?', [farmer.farm_id]);
    expect(cropsAfter).toHaveLength(0);
  });
});
