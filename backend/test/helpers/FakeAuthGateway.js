import { AuthGateway } from '../../src/auth/AuthGateway.js';

export class FakeAuthGateway extends AuthGateway {
  constructor() {
    super();
    /** @type {Map<string, { uid: string, email: string, disabled: boolean, tokensRevokedAt: number }>} */
    this.users = new Map();
    this.tokens = new Map(); // token -> uid
  }

  async verifyIdToken(token, checkRevoked = true) {
    const uid = this.tokens.get(token) || token.replace('bearer-', '');
    const user = this.users.get(uid);

    if (!user) {
      const err = new Error('Firebase token invalid');
      err.code = 'auth/argument-error';
      throw err;
    }

    if (checkRevoked && user.tokensRevokedAt && Date.now() < user.tokensRevokedAt) {
      const err = new Error('Firebase token revoked');
      err.code = 'auth/id-token-revoked';
      throw err;
    }

    return {
      uid: user.uid,
      email: user.email,
    };
  }

  async createUser({ email, password: _password, displayName: _displayName }) {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        const err = new Error('The email address is already in use by another account.');
        err.code = 'auth/email-already-exists';
        throw err;
      }
    }

    const uid = `fake-uid-${this.users.size + 1}`;
    const user = {
      uid,
      email,
      disabled: false,
      tokensRevokedAt: 0,
    };

    this.users.set(uid, user);
    this.tokens.set(`token-${uid}`, uid);

    return { uid, email };
  }

  async deleteUser(uid) {
    this.users.delete(uid);
    for (const [t, u] of this.tokens.entries()) {
      if (u === uid) this.tokens.delete(t);
    }
  }

  async setDisabled(uid, disabled) {
    const user = this.users.get(uid);
    if (user) {
      user.disabled = disabled;
    }
  }

  async revokeRefreshTokens(uid) {
    const user = this.users.get(uid);
    if (user) {
      user.tokensRevokedAt = Date.now() + 1000;
    }
  }
}
