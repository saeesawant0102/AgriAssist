import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Route protection guard for authenticated and role-based routes.
 */
export function ProtectedRoute({
  allowedRoles = [],
  children,
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-slate-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.user_type)) {
    // If an administrator tries to open farmer-only route, or vice-versa
    const defaultHome = profile.user_type === 'administrator' ? '/admin' : '/';
    return <Navigate to={defaultHome} replace />;
  }

  return children ? children : <Outlet />;
}
