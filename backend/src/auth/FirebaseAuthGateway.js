import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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
    this._localUsers = new Map();
  }

  _resolveCredPath() {
    const rawPath = env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!rawPath) return null;

    const candidates = [
      rawPath,
      path.resolve(rawPath),
      path.resolve(process.cwd(), rawPath),
      path.resolve(process.cwd(), 'backend', rawPath),
      path.resolve(process.cwd(), 'secrets/service-account.json'),
      path.resolve(process.cwd(), 'backend/secrets/service-account.json'),
    ];

    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          const stat = fs.statSync(p);
          if (stat.isFile()) return p;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  _isFirebaseConfigured() {
    const emulatorHost =
      process.env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST;
    if (emulatorHost) return true;
    const credPath = this._resolveCredPath();
    return Boolean(credPath);
  }

  get _auth() {
    if (!this._adminAuth) {
      if (admin.apps.length === 0) {
        const emulatorHost =
          process.env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST;
        const credPath = this._resolveCredPath();

        if (emulatorHost) {
          admin.initializeApp({
            projectId: env.FIREBASE_PROJECT_ID || 'demo-agriassist',
          });
        } else if (credPath) {
          admin.initializeApp({
            credential: admin.credential.cert(credPath),
            projectId: env.FIREBASE_PROJECT_ID,
          });
        } else {
          // No service account or emulator configured; do not invoke default Google ADC
          return null;
        }
      }
      this._adminAuth = admin.auth();
    }
    return this._adminAuth;
  }

  _getLocalUid(email) {
    const normalized = email.toLowerCase().trim();
    const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 20);
    return `local-uid-${hash}`;
  }

  // Requirement: SE-1, Auth.Login
  async verifyIdToken(token, checkRevoked = true) {
    if (this._isFirebaseConfigured()) {
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

    // Local development mode when Google Cloud credentials are not configured
    if (!token) {
      throw AppError.unauthenticated('Authentication token missing');
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const identifier = cleanToken
      .replace(/^local-token-/, '')
      .replace(/^bearer-/, '')
      .replace(/^token-/, '');

    const localUser = this._localUsers.get(identifier);
    if (localUser) {
      if (checkRevoked && localUser.tokensRevokedAt && Date.now() < localUser.tokensRevokedAt) {
        throw AppError.unauthenticated('Token has been revoked. Please log in again.');
      }
      return { uid: localUser.uid, email: localUser.email };
    }

    if (identifier.includes('@')) {
      const uid = this._getLocalUid(identifier);
      return { uid, email: identifier.toLowerCase().trim() };
    }

    return { uid: identifier, email: `${identifier}@agriassist.local` };
  }

  // Requirement: Auth.Register
  async createUser({ email, password, displayName }) {
    if (this._isFirebaseConfigured()) {
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

    // Local development fallback — SQLite is the source of truth for duplicates
    // (authService.register already checked before calling createUser)
    const normalizedEmail = email.toLowerCase().trim();
    const uid = this._getLocalUid(normalizedEmail);
    const user = { uid, email: normalizedEmail, displayName, disabled: false, tokensRevokedAt: 0 };
    this._localUsers.set(normalizedEmail, user);
    this._localUsers.set(uid, user);
    return { uid, email: normalizedEmail };
  }

  // Requirement: Auth.Register (compensation), D5
  async deleteUser(uid) {
    if (this._isFirebaseConfigured()) {
      try {
        await this._auth.deleteUser(uid);
      } catch (err) {
        // Deleting an already-missing Firebase user is a no-op per spec
        if (err.code === 'auth/user-not-found') {
          return;
        }
        throw err;
      }
      return;
    }

    const user = this._localUsers.get(uid);
    if (user) {
      this._localUsers.delete(user.email);
      this._localUsers.delete(uid);
    }
  }

  // Requirement: D7, Manage Farmer Accounts
  async setDisabled(uid, disabled) {
    if (this._isFirebaseConfigured()) {
      try {
        await this._auth.updateUser(uid, { disabled });
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          return;
        }
        throw err;
      }
      return;
    }

    const user = this._localUsers.get(uid);
    if (user) {
      user.disabled = disabled;
    }
  }

  // Requirement: Auth.Logout
  async revokeRefreshTokens(uid) {
    if (this._isFirebaseConfigured()) {
      try {
        await this._auth.revokeRefreshTokens(uid);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          return;
        }
        throw err;
      }
      return;
    }

    const user = this._localUsers.get(uid);
    if (user) {
      user.tokensRevokedAt = Date.now() + 1000;
    }
  }
}
