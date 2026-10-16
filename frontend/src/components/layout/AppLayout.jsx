import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

export function AppLayout({ user: overrideUser, onLogout: overrideLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const authContext = useAuth();

  const currentUser = overrideUser || authContext?.profile || {
    name: 'User',
    user_type: 'farmer',
    email: '',
  };

  const handleLogout = overrideLogout || authContext?.logout;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Navigation sidebar */}
      <Sidebar
        userType={currentUser?.user_type || 'farmer'}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar
          user={currentUser}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>

        <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <span>AgriAssist &bull; Local Agriculture &amp; Crop Advisory System &bull; </span>
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline"
          >
            Weather data by Open-Meteo.com
          </a>
        </footer>
      </div>
    </div>
  );
}
