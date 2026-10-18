import { AppError } from '../errors/AppError.js';
import * as userRepository from '../repositories/userRepository.js';

/**
 * Middleware to authenticate requests via Firebase ID token and match local SQLite user.
 * Requirement: SE-1, SE-2, OR-8
 * @param {import('../db/connection.js').Database} db
 * @param {import('../auth/AuthGateway.js').AuthGateway} authGateway
 */
export function createAuthenticateMiddleware(db, authGateway) {
  return async function authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw AppError.unauthenticated('Missing or invalid Authorization header');
      }

      const token = authHeader.substring(7).trim();
      if (!token) {
        throw AppError.unauthenticated('Authentication token missing');
      }

      // 1. Verify token with revocation checking
      let decoded;
      try {
        decoded = await authGateway.verifyIdToken(token, true);
      } catch (tokenErr) {
        if (tokenErr instanceof AppError) {
          throw tokenErr;
        }
        if (tokenErr.code === 'auth/id-token-revoked') {
          throw AppError.unauthenticated('Token has been revoked. Please log in again.');
        }
        throw AppError.unauthenticated(tokenErr.message || 'Invalid authentication token');
      }

      // 2. Lookup local user profile by firebase_uid (with fallback to email)
      let user = await userRepository.findUserByFirebaseUid(db, decoded.uid);
      if (!user && decoded.email) {
        user = await userRepository.findUserByEmail(db, decoded.email);
      }
      if (!user) {
        throw AppError.forbidden('User profile not found in local system', 'PROFILE_NOT_FOUND');
      }

      // 3. Reject disabled accounts
      if (user.status === 'disabled') {
        throw AppError.accountDisabled();
      }

      // 4. Attach user model to request
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
