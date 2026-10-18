import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as cropRepository from '../../src/repositories/cropRepository.js';
import * as farmRepository from '../../src/repositories/farmRepository.js';
import * as financialRepository from '../../src/repositories/financialRepository.js';
import * as profitabilityRepository from '../../src/repositories/profitabilityRepository.js';
import * as userRepository from '../../src/repositories/userRepository.js';
import { createTestApp } from '../helpers/createTestApp.js';

describe('Administration Integration (Feature 7 / Section 12.10)', () => {
  let app;
  let db;
  let authGateway;
  let clock;

  beforeEach(async () => {
    const testApp = await createTestApp({
      geocoder: async () => ({ latitude: 18.5204, longitude: 73.8567, name: 'Pune' }),
    });
    app = testApp.app;
    db = testApp.db;
    authGateway = testApp.authGateway;
    clock = testApp.clock;
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  async function createFarmer(email, name = 'Test Farmer', phone = '9876543210', address = 'Pune') {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name,
      email,
      password: 'Password123',
      phone,
      address,
    });
    const dbUser = await userRepository.findUserByEmail(db, email);
    const token = `Bearer bearer-${dbUser.firebase_uid}`;
    return {
      token,
      farmer_id: regRes.body.data.farmer_id,
      user_id: dbUser.user_id,
      firebase_uid: dbUser.firebase_uid,
      email,
      name,
    };
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
    return { token: `Bearer bearer-${fbUser.uid}`, user_id: adminUserId, firebase_uid: fbUser.uid, email, name };
  }

  it('Administrator.manage_system (D8): GET /admin/stats returns counts of farmers, farms, crops and financial records', async () => {
    const admin = await createAdmin();
    const farmer1 = await createFarmer('farmer1@example.com', 'Farmer 1');
    const _farmer2 = await createFarmer('farmer2@example.com', 'Farmer 2');

    const nowIso = clock.now().toISOString();

    const farmId = await farmRepository.insertFarm(db, {
      farmer_id: farmer1.farmer_id,
      farm_name: 'Farm 1',
      location: 'Pune',
      area: 10,
      latitude: 18.52,
      longitude: 73.85,
      created_at: nowIso,
      updated_at: nowIso,
    });

    await cropRepository.insertCrop(db, {
      farm_id: farmId,
      crop_name: 'Sugarcane',
      variety: 'CO86032',
      sowing_date: '2026-01-01',
      growth_stage: 'Vegetative',
      created_at: nowIso,
      updated_at: nowIso,
    });

    await db.transaction(async (tx) => {
      const recId = await financialRepository.insertFinancialRecord(tx, {
        farm_id: farmId,
        type: 'Expense',
        amount: 500,
        date: '2026-03-01',
        description: 'Seeds',
        created_at: nowIso,
        updated_at: nowIso,
      });
      await financialRepository.insertExpense(tx, recId);
    });

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', admin.token);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      farmer_count: 2,
      farm_count: 1,
      crop_count: 1,
      financial_record_count: 1,
    });
  });

  it('Administrator.view_all_reports (D9): GET /admin/reports returns overall profitability for all farms with farmer info', async () => {
    const admin = await createAdmin();
    const farmer = await createFarmer('richfarmer@example.com', 'Rich Farmer');
    const nowIso = clock.now().toISOString();

    const farmId = await farmRepository.insertFarm(db, {
      farmer_id: farmer.farmer_id,
      farm_name: 'Golden Acres',
      location: 'Solapur',
      area: 25,
      latitude: 17.6599,
      longitude: 75.9064,
      created_at: nowIso,
      updated_at: nowIso,
    });

    await profitabilityRepository.upsertOverallProfitability(db, farmId, {
      total_expense: 20000,
      total_income: 55000,
      net_profit: 35000,
      date: '2026-05-01',
      created_at: nowIso,
    });

    const res = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', admin.token);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const report = res.body.data.find((r) => r.farm_id === farmId);
    expect(report).toBeDefined();
    expect(report).toMatchObject({
      farm_id: farmId,
      farm_name: 'Golden Acres',
      location: 'Solapur',
      farmer_name: 'Rich Farmer',
      farmer_email: 'richfarmer@example.com',
      total_income: 55000,
      total_expense: 20000,
      net_profit: 35000,
    });
  });

  it('Administrator.manage_users: GET /admin/users implements keyset pagination and status filter', async () => {
    const admin = await createAdmin();

    // Create 3 farmers
    const f1 = await createFarmer('f1@example.com', 'Farmer 1');
    const f2 = await createFarmer('f2@example.com', 'Farmer 2');
    const f3 = await createFarmer('f3@example.com', 'Farmer 3');

    // Page 1 with limit=2
    const res1 = await request(app)
      .get('/api/v1/admin/users?limit=2')
      .set('Authorization', admin.token);

    expect(res1.status).toBe(200);
    expect(res1.body.data).toHaveLength(2);
    // Newest first (user_id DESC)
    expect(res1.body.data[0].user_id).toBe(f3.user_id);
    expect(res1.body.data[1].user_id).toBe(f2.user_id);
    expect(res1.body.next_cursor).toBe(f2.user_id);

    // Page 2 using cursor from Page 1
    const res2 = await request(app)
      .get(`/api/v1/admin/users?limit=2&cursor=${res1.body.next_cursor}`)
      .set('Authorization', admin.token);

    expect(res2.status).toBe(200);
    expect(res2.body.data).toHaveLength(1);
    expect(res2.body.data[0].user_id).toBe(f1.user_id);
    expect(res2.body.next_cursor).toBeNull();

    // Test status filter
    await db.run(`UPDATE users SET status = 'disabled' WHERE user_id = ?`, [f2.user_id]);

    const resDisabled = await request(app)
      .get('/api/v1/admin/users?status=disabled')
      .set('Authorization', admin.token);

    expect(resDisabled.status).toBe(200);
    expect(resDisabled.body.data).toHaveLength(1);
    expect(resDisabled.body.data[0].user_id).toBe(f2.user_id);

    const resActive = await request(app)
      .get('/api/v1/admin/users?status=active')
      .set('Authorization', admin.token);

    expect(resActive.status).toBe(200);
    const activeIds = resActive.body.data.map((u) => u.user_id);
    expect(activeIds).toContain(f1.user_id);
    expect(activeIds).toContain(f3.user_id);
    expect(activeIds).not.toContain(f2.user_id);
  });

  it('Administrator.manage_users: GET and PUT /admin/users/:userId view and update farmer profile', async () => {
    const admin = await createAdmin();
    const farmer = await createFarmer('profiletest@example.com', 'Original Name');

    // GET /admin/users/:userId
    const getRes = await request(app)
      .get(`/api/v1/admin/users/${farmer.user_id}`)
      .set('Authorization', admin.token);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.user_id).toBe(farmer.user_id);
    expect(getRes.body.data.name).toBe('Original Name');
    expect(getRes.body.data.firebase_uid).toBeUndefined(); // Never expose firebase_uid

    // PUT /admin/users/:userId
    const putRes = await request(app)
      .put(`/api/v1/admin/users/${farmer.user_id}`)
      .set('Authorization', admin.token)
      .send({
        name: 'Updated Name',
        phone: '+919876543210',
        address: 'New Village, Satara',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.name).toBe('Updated Name');
    expect(putRes.body.data.phone).toBe('+919876543210');
    expect(putRes.body.data.address).toBe('New Village, Satara');

    // Verify in database
    const dbUser = await userRepository.findUserById(db, farmer.user_id);
    expect(dbUser.name).toBe('Updated Name');
  });

  it('Administrator.manage_users: PATCH /admin/users/:userId/status disables and re-enables farmer login', async () => {
    const admin = await createAdmin();
    const farmer = await createFarmer('toggle@example.com', 'Toggle Farmer');

    // Farmer can initially access protected endpoint
    const initRes = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', farmer.token);
    expect(initRes.status).toBe(200);

    // 1. Admin disables farmer account
    const disableRes = await request(app)
      .patch(`/api/v1/admin/users/${farmer.user_id}/status`)
      .set('Authorization', admin.token)
      .send({ status: 'disabled' });

    expect(disableRes.status).toBe(200);
    expect(disableRes.body.data.status).toBe('disabled');

    // Farmer requests now return 401 (token revoked) or 403 (ACCOUNT_DISABLED)
    const blockedRes = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', farmer.token);
    expect([401, 403]).toContain(blockedRes.status);

    // 2. Admin re-enables farmer account
    const enableRes = await request(app)
      .patch(`/api/v1/admin/users/${farmer.user_id}/status`)
      .set('Authorization', admin.token)
      .send({ status: 'active' });

    expect(enableRes.status).toBe(200);
    expect(enableRes.body.data.status).toBe('active');

    // Farmer can access protected endpoints again
    const restoredRes = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', farmer.token);
    expect(restoredRes.status).toBe(200);
  });

  it('Administrator.manage_users: DELETE /admin/users/:userId removes Firebase user and cascades local SQLite data', async () => {
    const admin = await createAdmin();
    const farmer = await createFarmer('deleteme@example.com', 'To Delete');
    const nowIso = clock.now().toISOString();

    // Create a farm and crop for this farmer to verify cascade deletion
    const farmId = await farmRepository.insertFarm(db, {
      farmer_id: farmer.farmer_id,
      farm_name: 'Delete Farm',
      location: 'Pune',
      area: 4.0,
      latitude: 18.52,
      longitude: 73.85,
      created_at: nowIso,
      updated_at: nowIso,
    });

    const cropId = await cropRepository.insertCrop(db, {
      farm_id: farmId,
      crop_name: 'Barley',
      sowing_date: '2026-01-01',
      created_at: nowIso,
      updated_at: nowIso,
    });

    // Delete farmer
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/users/${farmer.user_id}`)
      .set('Authorization', admin.token);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data).toEqual({ deleted: true, id: farmer.user_id });

    // Verify Firebase user removed
    expect(authGateway.users.has(farmer.firebase_uid)).toBe(false);

    // Verify SQLite user removed
    const userCheck = await userRepository.findUserById(db, farmer.user_id);
    expect(userCheck).toBeNull();

    // Verify cascade removed farms and crops
    const farmCheck = await farmRepository.findFarmById(db, farmId);
    expect(farmCheck).toBeNull();

    const cropCheck = await cropRepository.findCropById(db, cropId);
    expect(cropCheck).toBeNull();
  });

  it('Administrator.manage_users: delete handles mid-way failure retry safely', async () => {
    const admin = await createAdmin();
    const farmer = await createFarmer('retrydelete@example.com', 'Retry Delete');

    // Simulate mid-way: Firebase user already deleted
    await authGateway.deleteUser(farmer.firebase_uid);

    // Call DELETE endpoint: should safely succeed because "user not found" in Firebase is treated as success
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/users/${farmer.user_id}`)
      .set('Authorization', admin.token);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data).toEqual({ deleted: true, id: farmer.user_id });

    const userCheck = await userRepository.findUserById(db, farmer.user_id);
    expect(userCheck).toBeNull();
  });

  it('D7: Admin cannot update, change status, or delete another admin or themselves', async () => {
    const admin1 = await createAdmin('admin1@example.com', 'Admin 1');
    const admin2 = await createAdmin('admin2@example.com', 'Admin 2');

    // Attempt to view admin account -> 403
    const getAdminRes = await request(app)
      .get(`/api/v1/admin/users/${admin2.user_id}`)
      .set('Authorization', admin1.token);
    expect(getAdminRes.status).toBe(403);

    // Attempt to update self -> 403
    const updateSelfRes = await request(app)
      .put(`/api/v1/admin/users/${admin1.user_id}`)
      .set('Authorization', admin1.token)
      .send({ name: 'Hacked Self' });
    expect(updateSelfRes.status).toBe(403);

    // Attempt to update another admin -> 403
    const updateAdminRes = await request(app)
      .put(`/api/v1/admin/users/${admin2.user_id}`)
      .set('Authorization', admin1.token)
      .send({ name: 'Hacked Admin' });
    expect(updateAdminRes.status).toBe(403);

    // Attempt to disable self -> 403
    const disableSelfRes = await request(app)
      .patch(`/api/v1/admin/users/${admin1.user_id}/status`)
      .set('Authorization', admin1.token)
      .send({ status: 'disabled' });
    expect(disableSelfRes.status).toBe(403);

    // Attempt to disable another admin -> 403
    const disableAdminRes = await request(app)
      .patch(`/api/v1/admin/users/${admin2.user_id}/status`)
      .set('Authorization', admin1.token)
      .send({ status: 'disabled' });
    expect(disableAdminRes.status).toBe(403);

    // Attempt to delete self -> 403
    const deleteSelfRes = await request(app)
      .delete(`/api/v1/admin/users/${admin1.user_id}`)
      .set('Authorization', admin1.token);
    expect(deleteSelfRes.status).toBe(403);

    // Attempt to delete another admin -> 403
    const deleteAdminRes = await request(app)
      .delete(`/api/v1/admin/users/${admin2.user_id}`)
      .set('Authorization', admin1.token);
    expect(deleteAdminRes.status).toBe(403);
  });

  it('Admin Farms: admin can view all farms, add on behalf of valid farmer, and delete farm', async () => {
    const admin = await createAdmin();
    const farmer = await createFarmer('farmowner@example.com', 'Farm Owner');

    // Admin creates farm on behalf of farmer
    const addRes = await request(app)
      .post('/api/v1/admin/farms')
      .set('Authorization', admin.token)
      .send({
        farmer_id: farmer.farmer_id,
        farm_name: 'Admin Added Farm',
        location: 'Pune',
        area: 15,
        latitude: 18.52,
        longitude: 73.85,
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.farm_name).toBe('Admin Added Farm');
    expect(addRes.body.data.farmer_id).toBe(farmer.farmer_id);
    const farmId = addRes.body.data.farm_id;

    // Admin views all farms
    const listRes = await request(app)
      .get('/api/v1/admin/farms')
      .set('Authorization', admin.token);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((f) => f.farm_id === farmId)).toBe(true);

    // Admin deletes farm
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/farms/${farmId}`)
      .set('Authorization', admin.token);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
  });

  it('SE-5: Every /api/v1/admin/* endpoint returns 403 when called by a farmer', async () => {
    const farmer = await createFarmer('unauthorized@example.com', 'Farmer Attempt');

    const endpoints = [
      { method: 'get', url: '/api/v1/admin/stats' },
      { method: 'get', url: '/api/v1/admin/reports' },
      { method: 'get', url: '/api/v1/admin/users' },
      { method: 'get', url: `/api/v1/admin/users/${farmer.user_id}` },
      { method: 'put', url: `/api/v1/admin/users/${farmer.user_id}`, body: { name: 'Test' } },
      { method: 'patch', url: `/api/v1/admin/users/${farmer.user_id}/status`, body: { status: 'active' } },
      { method: 'delete', url: `/api/v1/admin/users/${farmer.user_id}` },
      { method: 'get', url: '/api/v1/admin/farms' },
      { method: 'post', url: '/api/v1/admin/farms', body: { farm_name: 'F', location: 'L', area: 1, farmer_id: 1 } },
      { method: 'delete', url: '/api/v1/admin/farms/1' },
    ];

    for (const ep of endpoints) {
      let req = request(app)[ep.method](ep.url).set('Authorization', farmer.token);
      if (ep.body) req = req.send(ep.body);
      const res = await req;
      expect(res.status, `Expected 403 for ${ep.method.toUpperCase()} ${ep.url}`).toBe(403);
    }
  });
});
