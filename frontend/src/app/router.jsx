import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ChangePassword } from '../features/auth/pages/ChangePassword.jsx';
import { ForgotPassword } from '../features/auth/pages/ForgotPassword.jsx';
import { Login } from '../features/auth/pages/Login.jsx';
import { Profile } from '../features/auth/pages/Profile.jsx';
import { Register } from '../features/auth/pages/Register.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

function FarmerDashboardPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Farmer Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome to AgriAssist. Authentication &amp; Profile Management active.
          </p>
        </div>
      </div>

      <Card title="System Readiness">
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-200">
          Farmer authenticated successfully. Farm and crop features will be enabled in subsequent phases.
        </div>
      </Card>
    </div>
  );
}

function AdminDashboardPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System administration &amp; management active.
          </p>
        </div>
      </div>

      <Card title="System Overview">
        <div className="p-4 bg-purple-50 text-purple-800 rounded-lg text-sm border border-purple-200">
          Administrator authenticated successfully. System statistics and farmer account management ready.
        </div>
      </Card>
    </div>
  );
}

export const router = createBrowserRouter([
  // Public auth routes
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },

  // Protected farmer routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <FarmerDashboardPlaceholder /> },
      { path: 'profile', element: <Profile /> },
      { path: 'profile/change-password', element: <ChangePassword /> },
      { path: 'farms', element: <FarmerDashboardPlaceholder /> },
      { path: 'weather', element: <FarmerDashboardPlaceholder /> },
      { path: 'advisory', element: <FarmerDashboardPlaceholder /> },
      { path: 'irrigation', element: <FarmerDashboardPlaceholder /> },
      { path: 'finance', element: <FarmerDashboardPlaceholder /> },
      { path: 'reports', element: <FarmerDashboardPlaceholder /> },
    ],
  },

  // Protected admin routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['administrator']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPlaceholder /> },
      { path: 'users', element: <AdminDashboardPlaceholder /> },
      { path: 'farms', element: <AdminDashboardPlaceholder /> },
      { path: 'reports', element: <AdminDashboardPlaceholder /> },
    ],
  },

  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
