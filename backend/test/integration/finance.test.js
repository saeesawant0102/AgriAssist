import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as userRepository from '../../src/repositories/userRepository.js';
import { createTestApp } from '../helpers/createTestApp.js';

describe('Financial Records & Profitability Integration (Feature 6)', () => {
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

  // Helper: register farmer and return token + farmId
  async function createFarmerWithFarm(email, farmName = 'Green Valley') {
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
      .send({ farm_name: farmName, location: 'Pune, Maharashtra', area: 10 });

    const farmId = farmRes.body.data.farm_id;
    return { token, dbUser, farmId };
  }

  // Helper: create admin and return token
  async function createAdmin(email = 'admin@agriassist.test') {
    const fbUser = await authGateway.createUser({
      email,
      password: 'AdminPass123',
      displayName: 'System Admin',
    });
    const nowIso = new Date().toISOString();
    await db.transaction(async (tx) => {
      const userId = await userRepository.createUser(tx, {
        firebase_uid: fbUser.uid,
        user_type: 'administrator',
        name: 'System Admin',
        email,
        phone: null,
        address: null,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });
      await userRepository.createAdministrator(tx, { user_id: userId, role: 'admin', created_at: nowIso });
    });
    return `bearer-${fbUser.uid}`;
  }

  // -----------------------------------------------------------------------
  // Expense.Add
  // -----------------------------------------------------------------------
  it('Expense.Add: creates exactly one financial_records parent row and one expenses child row', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer1@test.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500, date: '2026-05-01', description: 'Seeds purchase' });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('Expense');
    expect(res.body.data.amount).toBe(500);
    expect(res.body.data.expense_id).toBeDefined();
    expect(res.body.data.record_id).toBeDefined();

    // Verify one parent + one child in DB
    const row = await db.get(
      `SELECT COUNT(*) AS cnt FROM financial_records WHERE farm_id = ? AND type = 'Expense'`,
      [farmId]
    );
    expect(row.cnt).toBe(1);

    const child = await db.get(
      `SELECT COUNT(*) AS cnt FROM expenses e
         JOIN financial_records f ON f.record_id = e.record_id
       WHERE f.farm_id = ?`,
      [farmId]
    );
    expect(child.cnt).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Income.Add
  // -----------------------------------------------------------------------
  it('Income.Add: creates exactly one financial_records parent row and one incomes child row', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer2@test.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/incomes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 12000, date: '2026-05-10', description: 'Harvest sale' });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('Income');
    expect(res.body.data.amount).toBe(12000);
    expect(res.body.data.income_id).toBeDefined();

    const child = await db.get(
      `SELECT COUNT(*) AS cnt FROM incomes i
         JOIN financial_records f ON f.record_id = i.record_id
       WHERE f.farm_id = ?`,
      [farmId]
    );
    expect(child.cnt).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Expense.Add validation: amount <= 0 rejected
  // -----------------------------------------------------------------------
  it('Expense.Add: rejects amount <= 0 with 400 VALIDATION_ERROR', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer3@test.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: -50, date: '2026-05-01', description: 'Invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // -----------------------------------------------------------------------
  // BR-6: profit math – profit scenario
  // -----------------------------------------------------------------------
  it('BR-6: overall profitability upserted as single row; net profit = income − expense', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer4@test.com');

    await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 3000, date: '2026-05-01' });

    await request(app)
      .post(`/api/v1/farms/${farmId}/incomes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 8000, date: '2026-05-10' });

    // Exactly one overall row per farm
    const rows = await db.all(
      `SELECT * FROM profitability WHERE farm_id = ? AND is_overall = 1`,
      [farmId]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].total_income).toBe(8000);
    expect(rows[0].total_expense).toBe(3000);
    expect(rows[0].net_profit).toBe(5000);
  });

  // -----------------------------------------------------------------------
  // BR-6: loss scenario (negative net profit)
  // -----------------------------------------------------------------------
  it('BR-6: handles operating loss (negative net_profit) correctly', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer5@test.com');

    await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 9000, date: '2026-05-01' });

    await request(app)
      .post(`/api/v1/farms/${farmId}/incomes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 2000, date: '2026-05-05' });

    const summaryRes = await request(app)
      .get(`/api/v1/farms/${farmId}/financial-summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.net_profit).toBe(-7000);
  });

  // -----------------------------------------------------------------------
  // Expense.View: listing with type filter
  // -----------------------------------------------------------------------
  it('Expense.View: lists records filtered by type', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer6@test.com');

    await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500, date: '2026-05-01' });

    await request(app)
      .post(`/api/v1/farms/${farmId}/incomes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1500, date: '2026-05-02' });

    const res = await request(app)
      .get(`/api/v1/farms/${farmId}/financial-records?type=Expense`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe('Expense');
  });

  // -----------------------------------------------------------------------
  // Class update_record: type must be immutable after update
  // -----------------------------------------------------------------------
  it('Class update_record: updates amount/date/description; type remains immutable', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer7@test.com');

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 400, date: '2026-05-01', description: 'Old' });

    const recordId = addRes.body.data.record_id;

    const updateRes = await request(app)
      .put(`/api/v1/financial-records/${recordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 750, date: '2026-05-03', description: 'Updated seeds' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.amount).toBe(750);
    expect(updateRes.body.data.type).toBe('Expense');
    expect(updateRes.body.data.description).toBe('Updated seeds');
  });

  // -----------------------------------------------------------------------
  // Class delete_record and overall profitability recalculated
  // -----------------------------------------------------------------------
  it('Class delete_record: deletes record and recalculates overall profitability', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer8@test.com');

    const expRes = await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, date: '2026-05-01' });
    const recordId = expRes.body.data.record_id;

    const delRes = await request(app)
      .delete(`/api/v1/financial-records/${recordId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deleted).toBe(true);

    // After deletion net_profit should go back to 0
    const summaryRes = await request(app)
      .get(`/api/v1/farms/${farmId}/financial-summary`)
      .set('Authorization', `Bearer ${token}`);
    expect(summaryRes.body.data.net_profit).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Profit.Calculate: date-range inserts new row (is_overall=0)
  // -----------------------------------------------------------------------
  it('Profit.Calculate: date-range calculation inserts a new profitability row (is_overall=0)', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer9@test.com');

    await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 2000, date: '2026-05-01' });

    await request(app)
      .post(`/api/v1/farms/${farmId}/incomes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000, date: '2026-05-15' });

    const calcRes = await request(app)
      .post(`/api/v1/farms/${farmId}/profitability/calculate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ start_date: '2026-05-01', end_date: '2026-05-15' });

    expect(calcRes.status).toBe(201);
    expect(calcRes.body.data.net_profit).toBe(3000);
    expect(calcRes.body.data.start_date).toBe('2026-05-01');
    expect(calcRes.body.data.end_date).toBe('2026-05-15');

    // Date-range row should be is_overall=0
    const row = await db.get(
      `SELECT * FROM profitability WHERE farm_id = ? AND is_overall = 0`,
      [farmId]
    );
    expect(row).toBeDefined();
    expect(row.net_profit).toBe(3000);

    // Still only one overall row
    const overalls = await db.all(
      `SELECT * FROM profitability WHERE farm_id = ? AND is_overall = 1`,
      [farmId]
    );
    expect(overalls.length).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Profit.Calculate: start_date after end_date returns 400
  // -----------------------------------------------------------------------
  it('Profit.Calculate: start_date after end_date returns 400 VALIDATION_ERROR', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer10@test.com');

    const res = await request(app)
      .post(`/api/v1/farms/${farmId}/profitability/calculate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ start_date: '2026-06-01', end_date: '2026-05-01' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // -----------------------------------------------------------------------
  // Profit.Report: returns profitability history newest first
  // -----------------------------------------------------------------------
  it('Profit.Report: returns profitability history for a farm', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer11@test.com');

    await request(app)
      .post(`/api/v1/farms/${farmId}/incomes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 6000, date: '2026-05-01' });

    await request(app)
      .post(`/api/v1/farms/${farmId}/profitability/calculate`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const res = await request(app)
      .get(`/api/v1/farms/${farmId}/profitability`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // Export Report: JSON dataset structure
  // -----------------------------------------------------------------------
  it('Export Report: returns dataset with farm, period, records, totals and generated_at', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer12@test.com');

    await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 300, date: '2026-05-01', description: 'Fertilizer' });

    const res = await request(app)
      .get(`/api/v1/farms/${farmId}/reports/financial`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.farm).toBeDefined();
    expect(res.body.data.period).toBeDefined();
    expect(Array.isArray(res.body.data.records)).toBe(true);
    expect(res.body.data.totals).toBeDefined();
    expect(res.body.data.generated_at).toBeDefined();
    expect(res.body.data.records.length).toBe(1);
    expect(res.body.data.totals.total_expense).toBe(300);
  });

  // -----------------------------------------------------------------------
  // SE-5 ownership: farmer cannot view another farmer's records
  // -----------------------------------------------------------------------
  it('SE-5: farmer cannot access financial records of a farm they do not own', async () => {
    const { farmId: farmId1 } = await createFarmerWithFarm('farmer13@test.com');
    const { token: token2 } = await createFarmerWithFarm('farmer14@test.com', 'Another Farm');

    const res = await request(app)
      .get(`/api/v1/farms/${farmId1}/financial-records`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // SE-5: admin can view records but not mutate
  // -----------------------------------------------------------------------
  it('SE-5: admin can view financial records but cannot add expenses (403)', async () => {
    const { farmId } = await createFarmerWithFarm('farmer15@test.com');
    const adminToken = await createAdmin();

    const viewRes = await request(app)
      .get(`/api/v1/farms/${farmId}/financial-records`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(viewRes.status).toBe(200);

    const addRes = await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100, date: '2026-05-01' });
    expect(addRes.status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // Cascade delete: farm deletion removes financial records
  // -----------------------------------------------------------------------
  it('Cascade: deleting farm cascades to financial_records and profitability', async () => {
    const { token, farmId } = await createFarmerWithFarm('farmer16@test.com');

    await request(app)
      .post(`/api/v1/farms/${farmId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, date: '2026-05-01' });

    await request(app)
      .delete(`/api/v1/farms/${farmId}`)
      .set('Authorization', `Bearer ${token}`);

    const rows = await db.all(
      `SELECT * FROM financial_records WHERE farm_id = ?`,
      [farmId]
    );
    expect(rows.length).toBe(0);

    const profits = await db.all(
      `SELECT * FROM profitability WHERE farm_id = ?`,
      [farmId]
    );
    expect(profits.length).toBe(0);
  });
});
