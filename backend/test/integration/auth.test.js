import { Router } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { requireRole } from '../../src/middleware/authorize.js';
import * as userRepository from '../../src/repositories/userRepository.js';
import { createTestApp } from '../helpers/createTestApp.js';

describe('Authentication & Profile Integration (Feature 1)', () => {
  let app;
  let db;
  let authGateway;

  beforeEach(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    db = testApp.db;
    authGateway = testApp.authGateway;
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  it('Auth.Register: creates Firebase user and local users & farmers records without password', async () => {
    const payload = {
      name: 'Ramesh Patel',
      email: 'Ramesh@Example.com',
      password: 'StrongPassword123',
      phone: '+919876543210',
      address: 'Village Green, Farm 1',
    };

    const res = await request(app).post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('Ramesh Patel');
    expect(res.body.data.email).toBe('ramesh@example.com');
    expect(res.body.data.user_type).toBe('farmer');
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.farmer_id).toBeDefined();
    expect(res.body.data.farm_count).toBe(0);

    // Verify security: No password in response or database
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.firebase_uid).toBeUndefined();

    const dbUser = await db.get('SELECT * FROM users WHERE email = ?', ['ramesh@example.com']);
    expect(dbUser).toBeDefined();
    expect(dbUser.password).toBeUndefined();
    expect(dbUser.user_type).toBe('farmer');

    const dbFarmer = await db.get('SELECT * FROM farmers WHERE user_id = ?', [dbUser.user_id]);
    expect(dbFarmer).toBeDefined();
    expect(dbFarmer.farm_count).toBe(0);
  });

  it('Auth.Register: returns 409 EMAIL_ALREADY_EXISTS when email is already registered', async () => {
    const payload = {
      name: 'Farmer One',
      email: 'duplicate@example.com',
      password: 'StrongPassword123',
    };

    // First registration
    const firstRes = await request(app).post('/api/v1/auth/register').send(payload);
    expect(firstRes.status).toBe(201);

    // Duplicate attempt
    const secondRes = await request(app).post('/api/v1/auth/register').send({
      ...payload,
      name: 'Farmer Two',
      email: 'DUPLICATE@example.com', // case insensitive check
    });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('Auth.Register: returns 400 VALIDATION_ERROR for invalid inputs', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'A', // too short
      email: 'invalid-email',
      password: '123', // too short
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
  });

  it('Auth.Register: deletes Firebase user if local SQLite write fails (compensation)', async () => {
    // Spy on authGateway.deleteUser
    let deletedUid = null;
    const origDelete = authGateway.deleteUser.bind(authGateway);
    authGateway.deleteUser = async (uid) => {
      deletedUid = uid;
      return origDelete(uid);
    };

    // Mock db.transaction to fail
    const origTx = db.transaction.bind(db);
    db.transaction = async () => {
      throw new Error('Simulated SQLite disk error');
    };

    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Failing Farmer',
      email: 'failing@example.com',
      password: 'StrongPassword123',
    });

    expect(res.status).toBe(500);
    expect(deletedUid).not.toBeNull();
    expect(deletedUid).toMatch(/^fake-uid-/);

    // Restore transaction
    db.transaction = origTx;
  });

  it('Auth.Login: logs in user with valid token and returns active profile', async () => {
    // Register a user first
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Login Farmer',
      email: 'login@example.com',
      password: 'StrongPassword123',
    });
    expect(regRes.status).toBe(201);

    // Get the fake token for this user
    const dbUser = await userRepository.findUserByEmail(db, 'login@example.com');
    const token = `bearer-${dbUser.firebase_uid}`;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Authorization', `Bearer ${token}`);

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.email).toBe('login@example.com');
    expect(loginRes.body.data.farmer_id).toBeDefined();
  });

  it('Auth.Login: returns 401 UNAUTHENTICATED when Authorization header is missing or invalid', async () => {
    const res = await request(app).post('/api/v1/auth/login');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');

    const invalidRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Authorization', 'Bearer invalid-token-xyz');
    expect(invalidRes.status).toBe(401);
  });

  it('Auth.Login: returns 401 UNAUTHENTICATED when token is revoked', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Revoke Farmer',
      email: 'revoke@example.com',
      password: 'StrongPassword123',
    });
    expect(regRes.status).toBe(201);

    const dbUser = await userRepository.findUserByEmail(db, 'revoke@example.com');
    const token = `bearer-${dbUser.firebase_uid}`;

    // Revoke token
    await authGateway.revokeRefreshTokens(dbUser.firebase_uid);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('Auth.Login: returns 403 ACCOUNT_DISABLED when account status is disabled', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Disabled Farmer',
      email: 'disabled@example.com',
      password: 'StrongPassword123',
    });

    const dbUser = await userRepository.findUserByEmail(db, 'disabled@example.com');
    await userRepository.updateUserStatus(db, dbUser.user_id, 'disabled', new Date().toISOString());

    const token = `bearer-${dbUser.firebase_uid}`;
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('Auth.Login: returns 403 PROFILE_NOT_FOUND when user exists in Firebase but has no local record', async () => {
    // Create in Firebase only
    const fbUser = await authGateway.createUser({
      email: 'noprofile@example.com',
      password: 'Password123',
    });

    const token = `bearer-${fbUser.uid}`;
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  it('Auth.Logout: revokes tokens and returns success', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Logout Farmer',
      email: 'logout@example.com',
      password: 'StrongPassword123',
    });

    const dbUser = await userRepository.findUserByEmail(db, 'logout@example.com');
    const token = `bearer-${dbUser.firebase_uid}`;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Logged out successfully');

    // Token should now be revoked
    const checkRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Authorization', `Bearer ${token}`);
    expect(checkRes.status).toBe(401);
  });

  it('Auth.Profile.View: returns authenticated user profile', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Profile Farmer',
      email: 'profile@example.com',
      password: 'StrongPassword123',
      phone: '+919988776655',
    });

    const dbUser = await userRepository.findUserByEmail(db, 'profile@example.com');
    const token = `bearer-${dbUser.firebase_uid}`;

    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Profile Farmer');
    expect(res.body.data.phone).toBe('+919988776655');
    expect(res.body.data.email).toBe('profile@example.com');
  });

  it('Auth.Profile.Update: updates name, phone, address and ignores/forbids email change', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Original Name',
      email: 'original@example.com',
      password: 'StrongPassword123',
    });

    const dbUser = await userRepository.findUserByEmail(db, 'original@example.com');
    const token = `bearer-${dbUser.firebase_uid}`;

    const updateRes = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        phone: '+911122334455',
        address: 'New Farm Location',
        email: 'hacked@example.com', // Should be ignored/not changed
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Updated Name');
    expect(updateRes.body.data.phone).toBe('+911122334455');
    expect(updateRes.body.data.address).toBe('New Farm Location');
    expect(updateRes.body.data.email).toBe('original@example.com'); // email cannot change (D2)
  });

  it('SE-3: requireRole denies farmer attempting admin-only endpoint with 403 FORBIDDEN', async () => {
    // Register farmer
    await request(app).post('/api/v1/auth/register').send({
      name: 'Role Farmer',
      email: 'rolefarmer@example.com',
      password: 'StrongPassword123',
    });

    const dbUser = await userRepository.findUserByEmail(db, 'rolefarmer@example.com');
    const farmerToken = `bearer-${dbUser.firebase_uid}`;

    // Create an app with an admin-only test route
    const adminRouter = Router();
    const authenticate = (await import('../../src/middleware/authenticate.js')).createAuthenticateMiddleware(
      db,
      authGateway
    );
    adminRouter.get('/admin-test-only', authenticate, requireRole('administrator'), (req, res) => {
      res.json({ ok: true });
    });

    const customApp = createApp({ db, authGateway, extraRoutes: adminRouter });

    const deniedRes = await request(customApp)
      .get('/admin-test-only')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.error.code).toBe('FORBIDDEN');
  });
});
