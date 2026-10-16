import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CloudRain,
  DollarSign,
  Droplets,
  Home,
  Layers,
  Sprout,
  Users,
  X,
} from 'lucide-react';

export function Sidebar({ userType = 'farmer', isOpen = false, onClose = () => {} }) {
  const farmerLinks = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/farms', label: 'My Farms', icon: Layers },
    { to: '/weather', label: 'Weather', icon: CloudRain },
    { to: '/advisory', label: 'Crop Advisory', icon: Sprout },
    { to: '/irrigation', label: 'Irrigation', icon: Droplets },
    { to: '/finance', label: 'Finance & Profit', icon: DollarSign },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  const adminLinks = [
    { to: '/admin', label: 'System Overview', icon: Home },
    { to: '/admin/users', label: 'Farmer Accounts', icon: Users },
    { to: '/admin/farms', label: 'All Farms', icon: Layers },
    { to: '/admin/reports', label: 'All Reports', icon: BarChart3 },
  ];

  const links = userType === 'administrator' ? adminLinks : farmerLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-inner">
              🌱
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">
                AgriAssist
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 block -mt-1">
                {userType === 'administrator' ? 'Admin Portal' : 'Smart Agriculture'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                end={link.to === '/' || link.to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <p className="font-medium text-slate-300">Local Agriculture System</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Weather data by Open-Meteo</p>
        </div>
      </aside>
    </>
  );
}
