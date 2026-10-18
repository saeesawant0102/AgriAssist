import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  DollarSign,
  Layers,
  ShieldCheck,
  Sprout,
  Users,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { getAdminStatsApi } from '../api.js';

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminStatsApi();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load system statistics');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const farmerCount = stats?.farmer_count ?? 0;
  const farmCount = stats?.farm_count ?? 0;
  const cropCount = stats?.crop_count ?? 0;
  const recordCount = stats?.financial_record_count ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System overview, farmer accounts, parcels, and profitability reporting.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>System Admin Active</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Farmers
            </span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{farmerCount}</span>
            <Link
              to="/admin/users"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Managed Farms
            </span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{farmCount}</span>
            <Link
              to="/admin/farms"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>View farms</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Planted Crops
            </span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sprout className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{cropCount}</span>
            <span className="text-xs font-medium text-slate-400">Total active</span>
          </div>
        </Card>

        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Financial Records
            </span>
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{recordCount}</span>
            <Link
              to="/admin/reports"
              className="text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <span>Reports</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Admin Modules Quick Access */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Administration Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="p-6 hover:border-blue-400 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Farmer Accounts</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              View registered farmers, update profile records, toggle active/disabled states, or remove accounts.
            </p>
            <Link to="/admin/users">
              <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2">
                <span>Manage Accounts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>

          <Card className="p-6 hover:border-emerald-400 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">All Farms &amp; Parcels</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              View all registered farms across farmers, add farms on behalf of farmers, and delete parcels.
            </p>
            <Link to="/admin/farms">
              <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2">
                <span>View All Farms</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>

          <Card className="p-6 hover:border-purple-400 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">All Financial Reports</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              View comprehensive profitability and financial summary reports for every farm in the system.
            </p>
            <Link to="/admin/reports">
              <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2">
                <span>View Reports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
