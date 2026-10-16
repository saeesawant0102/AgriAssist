import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, User } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

export function Topbar({
  user = { name: 'Demo Farmer', user_type: 'farmer', email: 'farmer@example.com' },
  onMenuClick = () => {},
  onLogout = () => {},
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="p-2 text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-slate-700 hidden sm:inline-block">
          AgriAssist Management Dashboard
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* User profile dropdown / info */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          title="View profile"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs border border-emerald-200">
            {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              {user.name || 'User'}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge
                variant={user.user_type === 'administrator' ? 'purple' : 'success'}
                size="sm"
              >
                {user.user_type === 'administrator' ? 'Admin' : 'Farmer'}
              </Badge>
            </div>
          </div>
        </Link>

        {/* Logout action button */}
        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
