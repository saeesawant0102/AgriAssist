import fs from 'fs';
import admin from 'firebase-admin';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { AuthGateway } from './AuthGateway.js';

export class FirebaseAuthGateway extends AuthGateway {
  /**
   * @param {admin.auth.Auth} [adminAuth]
   */
  constructor(adminAuth = null) {
    super();
    this._adminAuth = adminAuth;
  }

  get _auth() {
    if (!this._adminAuth) {
      if (admin.apps.length === 0) {
        const emulatorHost =
          process.env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST;
        const credPath = env.GOOGLE_APPLICATION_CREDENTIALS;

        if (emulatorHost) {
          admin.initializeApp({
            projectId: env.FIREBASE_PROJECT_ID || 'demo-agriassist',
          });
        } else if (credPath && fs.existsSync(credPath)) {
          admin.initializeApp({
            credential: admin.credential.cert(credPath),
            projectId: env.FIREBASE_PROJECT_ID,
          });
        } else {
          admin.initializeApp({
            projectId: env.FIREBASE_PROJECT_ID || 'demo-agriassist',
          });
        }
      }
      this._adminAuth = admin.auth();
    }
    return this._adminAuth;
  }

  // Requirement: SE-1, Auth.Login
  async verifyIdToken(token, checkRevoked = true) {
    try {
      const decoded = await this._auth.verifyIdToken(token, checkRevoked);
      return {
        uid: decoded.uid,
        email: decoded.email,
      };
    } catch (err) {
      if (err.code === 'auth/id-token-revoked') {
        throw AppError.unauthenticated('Token has been revoked. Please log in again.');
      }
      if (err.code === 'auth/id-token-expired') {
        throw AppError.unauthenticated('Token has expired. Please log in again.');
      }
      throw AppError.unauthenticated('Invalid authentication token.');
    }
  }

  // Requirement: Auth.Register
  async createUser({ email, password, displayName }) {
    try {
      const userRecord = await this._auth.createUser({
        email,
        password,
        displayName,
      });
      return {
        uid: userRecord.uid,
        email: userRecord.email,
      };
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        throw AppError.emailAlreadyExists();
      }
      throw AppError.badRequest(err.message || 'Failed to create user in authentication provider');
    }
  }

  // Requirement: Auth.Register (compensation), D5
  async deleteUser(uid) {
    try {
      await this._auth.deleteUser(uid);
    } catch (err) {
      // Deleting an already-missing Firebase user is a no-op per spec
      if (err.code === 'auth/user-not-found') {
        return;
      }
      throw err;
    }
  }

  // Requirement: D7, Manage Farmer Accounts
  async setDisabled(uid, disabled) {
    try {
      await this._auth.updateUser(uid, { disabled });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return;
      }
      throw err;
    }
  }

  // Requirement: Auth.Logout
  async revokeRefreshTokens(uid) {
    try {
      await this._auth.revokeRefreshTokens(uid);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return;
      }
      throw err;
    }
  }
}
