/**
 * @typedef {Object} VerifiedToken
 * @property {string} uid
 * @property {string} email
 */

/**
 * @typedef {Object} CreatedAuthUser
 * @property {string} uid
 * @property {string} email
 */

/**
 * AuthGateway contract (base class).
 * Services and middleware depend on this contract, never directly on firebase-admin.
 */
export class AuthGateway {
  /**
   * Verifies an ID token.
   * @param {string} _token
   * @param {boolean} [_checkRevoked=true]
   * @returns {Promise<VerifiedToken>}
   */
  async verifyIdToken(_token, _checkRevoked = true) {
    throw new Error('Not implemented: AuthGateway.verifyIdToken');
  }

  /**
   * Creates an authentication user.
   * @param {{ email: string, password?: string, displayName?: string }} _params
   * @returns {Promise<CreatedAuthUser>}
   */
  async createUser(_params) {
    throw new Error('Not implemented: AuthGateway.createUser');
  }

  /**
   * Deletes a user. Must be idempotent (deleting an already missing user is a no-op).
   * @param {string} _uid
   * @returns {Promise<void>}
   */
  async deleteUser(_uid) {
    throw new Error('Not implemented: AuthGateway.deleteUser');
  }

  /**
   * Disables or enables a user.
   * @param {string} _uid
   * @param {boolean} _disabled
   * @returns {Promise<void>}
   */
  async setDisabled(_uid, _disabled) {
    throw new Error('Not implemented: AuthGateway.setDisabled');
  }

  /**
   * Revokes all refresh tokens for a user.
   * @param {string} _uid
   * @returns {Promise<void>}
   */
  async revokeRefreshTokens(_uid) {
    throw new Error('Not implemented: AuthGateway.revokeRefreshTokens');
  }
}
