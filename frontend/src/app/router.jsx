import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { AdminDashboard } from '../features/admin/pages/AdminDashboard.jsx';
import { AdminFarms } from '../features/admin/pages/AdminFarms.jsx';
import { AllReports } from '../features/admin/pages/AllReports.jsx';
import { FarmerAccountDetails } from '../features/admin/pages/FarmerAccountDetails.jsx';
import { FarmerAccounts } from '../features/admin/pages/FarmerAccounts.jsx';
import { CropAdvisory } from '../features/advisory/pages/CropAdvisory.jsx';
import { ChangePassword } from '../features/auth/pages/ChangePassword.jsx';
import { ForgotPassword } from '../features/auth/pages/ForgotPassword.jsx';
import { Login } from '../features/auth/pages/Login.jsx';
import { Profile } from '../features/auth/pages/Profile.jsx';
import { Register } from '../features/auth/pages/Register.jsx';
import { CropDetails } from '../features/crops/pages/CropDetails.jsx';
import { CropEdit } from '../features/crops/pages/CropEdit.jsx';
import { FarmerDashboard } from '../features/dashboard/pages/FarmerDashboard.jsx';
import { FarmCreate } from '../features/farms/pages/FarmCreate.jsx';
import { FarmDetails } from '../features/farms/pages/FarmDetails.jsx';
import { FarmEdit } from '../features/farms/pages/FarmEdit.jsx';
import { FarmList } from '../features/farms/pages/FarmList.jsx';
import { Finance } from '../features/finance/pages/Finance.jsx';
import { Profitability } from '../features/finance/pages/Profitability.jsx';
import { IrrigationScheduling } from '../features/irrigation/pages/IrrigationScheduling.jsx';
import { Reports } from '../features/reports/pages/Reports.jsx';
import { WeatherDashboard } from '../features/weather/pages/WeatherDashboard.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

export const router = createBrowserRouter([
  // Public auth routes
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },

  // Protected farmer routes
  {
    path: '/',
    element: (
      <ProtectedRoute allowedRoles={['farmer']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <FarmerDashboard /> },
      { path: 'profile', element: <Profile /> },
      { path: 'profile/change-password', element: <ChangePassword /> },
      { path: 'farms', element: <FarmList /> },
      { path: 'farms/new', element: <FarmCreate /> },
      { path: 'farms/:farmId', element: <FarmDetails /> },
      { path: 'farms/:farmId/edit', element: <FarmEdit /> },
      { path: 'crops/:cropId', element: <CropDetails /> },
      { path: 'crops/:cropId/edit', element: <CropEdit /> },
      { path: 'weather', element: <WeatherDashboard /> },
      { path: 'advisory', element: <CropAdvisory /> },
      { path: 'irrigation', element: <IrrigationScheduling /> },
      { path: 'finance', element: <Finance /> },
      { path: 'finance/profitability', element: <Profitability /> },
      { path: 'reports', element: <Reports /> },
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
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <FarmerAccounts /> },
      { path: 'users/:userId', element: <FarmerAccountDetails /> },
      { path: 'farms', element: <AdminFarms /> },
      { path: 'farms/:farmId', element: <FarmDetails /> },
      { path: 'crops/:cropId', element: <CropDetails /> },
      { path: 'reports', element: <AllReports /> },
    ],
  },

  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
