import { AppError } from '../errors/AppError.js';

/**
 * Middleware to enforce role-based access control based on user.user_type.
 * Requirement: SE-3
 * @param  {...string} allowedRoles - 'farmer' | 'administrator'
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthenticated());
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      return next(AppError.forbidden('Insufficient permissions to access this resource'));
    }

    next();
  };
}
