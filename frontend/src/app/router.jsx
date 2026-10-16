import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

// Phase 0 placeholder dashboard component
function Phase0Home() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            AgriAssist Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Foundation and Tooling phase initialized successfully.
          </p>
        </div>
      </div>

      <Card
        title="Full-Stack Skeleton Status"
        subtitle="Phase 0: Foundation and Tooling"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-200">
            <span className="font-semibold">Backend Server:</span>
            <span>Running on http://localhost:4000 (Proxy active on /api)</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 text-slate-800 rounded-lg text-sm border border-slate-200">
            <span className="font-semibold">Database Engine:</span>
            <span>Local SQLite (Promise-based Database wrapper)</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-200">
            <span className="font-semibold">Authentication Gateway:</span>
            <span>Firebase Auth Emulator on port 9099</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Phase0Home />,
      },
      // Placeholders for future phases
      { path: 'farms', element: <Phase0Home /> },
      { path: 'weather', element: <Phase0Home /> },
      { path: 'advisory', element: <Phase0Home /> },
      { path: 'irrigation', element: <Phase0Home /> },
      { path: 'finance', element: <Phase0Home /> },
      { path: 'reports', element: <Phase0Home /> },
      { path: 'profile', element: <Phase0Home /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['administrator']}>
        <AppLayout user={{ name: 'Admin', user_type: 'administrator', email: 'admin@agriassist.local' }} />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Phase0Home /> },
      { path: 'users', element: <Phase0Home /> },
      { path: 'farms', element: <Phase0Home /> },
      { path: 'reports', element: <Phase0Home /> },
    ],
  },
  {
    path: '/login',
    element: <Phase0Home />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
