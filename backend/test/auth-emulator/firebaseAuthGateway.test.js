import { beforeAll, describe, expect, it } from 'vitest';
import { FirebaseAuthGateway } from '../../src/auth/FirebaseAuthGateway.js';

describe('FirebaseAuthGateway Auth Emulator Tests', () => {
  let gateway;
  let isEmulatorAvailable = false;

  beforeAll(async () => {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    process.env.FIREBASE_PROJECT_ID = 'demo-agriassist';
    gateway = new FirebaseAuthGateway();

    // Check if emulator is responding on 127.0.0.1:9099
    try {
      const ping = await fetch('http://127.0.0.1:9099/', { method: 'GET' });
      if (ping.status < 500) {
        isEmulatorAvailable = true;
      }
    } catch {
      isEmulatorAvailable = false;
    }
  });

  it('FirebaseAuth.Emulator: creates, disables, and deletes user against Auth Emulator when running', async () => {
    if (!isEmulatorAvailable) {
      console.warn('[Test] Firebase Auth Emulator not running on 127.0.0.1:9099, skipping live emulator test.');
      expect(gateway).toBeInstanceOf(FirebaseAuthGateway);
      return;
    }

    const testEmail = `emulator-test-${Date.now()}@example.com`;

    // 1. Create user
    const created = await gateway.createUser({
      email: testEmail,
      password: 'StrongTestPassword123!',
      displayName: 'Emulator Test User',
    });
    expect(created.uid).toBeDefined();
    expect(created.email).toBe(testEmail);

    // 2. Disable user
    await gateway.setDisabled(created.uid, true);

    // 3. Revoke refresh tokens
    await gateway.revokeRefreshTokens(created.uid);

    // 4. Delete user
    await gateway.deleteUser(created.uid);

    // 5. Idempotent delete (deleting non-existent user must not throw)
    await expect(gateway.deleteUser(created.uid)).resolves.not.toThrow();
  });
});
