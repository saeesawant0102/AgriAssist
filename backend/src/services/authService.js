import { AppError } from '../errors/AppError.js';
import * as userRepository from '../repositories/userRepository.js';

export class AuthService {
  /**
   * @param {Object} deps
   * @param {import('../db/connection.js').Database} deps.db
   * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
   * @param {import('../utils/clock.js').Clock} deps.clock
   */
  constructor({ db, authGateway, clock }) {
    this.db = db;
    this.authGateway = authGateway;
    this.clock = clock;
  }

  // Requirement: Auth.Register
  async register({ name, email, password, phone = null, address = null }) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check local collision first
    const existing = await userRepository.findUserByEmail(this.db, normalizedEmail);
    if (existing) {
      throw AppError.emailAlreadyExists();
    }

    // 2. Create user in Firebase Auth
    const fbUser = await this.authGateway.createUser({
      email: normalizedEmail,
      password,
      displayName: name,
    });

    // 3. Atomically insert users and farmers rows with compensation
    const nowIso = this.clock.iso();
    try {
      const user = await this.db.transaction(async (tx) => {
        const userId = await userRepository.createUser(tx, {
          firebase_uid: fbUser.uid,
          user_type: 'farmer',
          name,
          email: normalizedEmail,
          phone: phone || null,
          address: address || null,
          status: 'active',
          created_at: nowIso,
          updated_at: nowIso,
        });

        await userRepository.createFarmer(tx, {
          user_id: userId,
          farm_count: 0,
        });

        return userRepository.findUserById(tx, userId);
      });

      return user.toJSON();
    } catch (sqlErr) {
      // Compensation: delete Firebase user if SQLite insertion fails
      console.error('[AuthService] SQLite write failed, compensating Firebase user:', sqlErr.message);
      try {
        await this.authGateway.deleteUser(fbUser.uid);
      } catch (deleteErr) {
        console.error('[AuthService] Compensation failed to delete Firebase user:', deleteErr.message);
      }
      throw sqlErr;
    }
  }

  // Requirement: Auth.Login
  async login(user) {
    if (user.status === 'disabled') {
      throw AppError.accountDisabled();
    }
    return user.toJSON();
  }

  // Requirement: Auth.Logout
  async logout(user) {
    if (user.firebase_uid) {
      await this.authGateway.revokeRefreshTokens(user.firebase_uid);
    }
    return { message: 'Logged out successfully' };
  }
}
