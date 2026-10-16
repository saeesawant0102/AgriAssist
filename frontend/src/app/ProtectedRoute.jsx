import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * Route protection guard for authenticated and role-based routes.
 * In Phase 0, functions as a structural placeholder.
 */
export function ProtectedRoute({
  isAuthenticated = true,
  userRole = 'farmer',
  allowedRoles = [],
  children,
}) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}
