import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CloudRain,
  DollarSign,
  Droplets,
  Layers,
  Plus,
  Sprout,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { getDashboardApi } from '../api.js';

export function FarmerDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currencyCode = import.meta.env.VITE_CURRENCY_CODE || 'INR';

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboardApi();
        setDashboard(data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  const farmCount = dashboard?.farm_count ?? 0;
  const cropCount = dashboard?.crop_count ?? 0;
  const netProfit = dashboard?.overall_net_profit ?? 0;
  const nextIrrigation = dashboard?.next_irrigation_date;
  const latestAdvisory = dashboard?.latest_advisory;

  const isProfitable = netProfit >= 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Farmer Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of your agricultural holdings, crop advisories, and financial performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/farms/new">
            <Button variant="primary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Add Farm</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Farms */}
        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Farms
            </span>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{farmCount}</span>
            <Link
              to="/farms"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Total Crops */}
        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Crops
            </span>
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sprout className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{cropCount}</span>
            <Link
              to="/farms"
              className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <span>View crops</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Overall Net Profit */}
        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overall Net Profit
            </span>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isProfitable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {isProfitable ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className={`text-2xl font-extrabold ${
                isProfitable ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {currencyCode} {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <Link
              to="/finance/profitability"
              className="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1"
            >
              <span>Details</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Next Irrigation Date */}
        <Card className="p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Next Irrigation
            </span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-lg font-bold text-slate-900">
              {nextIrrigation ? nextIrrigation : 'None scheduled'}
            </span>
            <Link
              to="/irrigation"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Schedule</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Latest Crop Advisory Section */}
      <Card title="Latest Crop Advisory">
        <div className="p-6">
          {latestAdvisory ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    {latestAdvisory.crop_name}
                  </span>
                  <span className="text-xs text-slate-500">at {latestAdvisory.farm_name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{latestAdvisory.date}</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {latestAdvisory.recommendation}
                </h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {latestAdvisory.message}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Link to="/advisory">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <span>View all advisories</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Sprout className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">No crop advisory generated yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Generate weather-based recommendations for your crops to protect against rain, frost, heat stress, or dry spells.
              </p>
              <div className="mt-4">
                <Link to="/advisory">
                  <Button variant="primary" size="sm">
                    Go to Crop Advisory
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Action Navigation */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link
            to="/weather"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <CloudRain className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-900">Weather Forecast</span>
            <span className="text-[11px] text-slate-500 mt-1">7-day weather &amp; alerts</span>
          </Link>

          <Link
            to="/advisory"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <Sprout className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-900">Crop Advisory</span>
            <span className="text-[11px] text-slate-500 mt-1">Smart recommendations</span>
          </Link>

          <Link
            to="/irrigation"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <Droplets className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-900">Irrigation</span>
            <span className="text-[11px] text-slate-500 mt-1">Water schedules &amp; skip</span>
          </Link>

          <Link
            to="/finance"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-900">Record Finances</span>
            <span className="text-[11px] text-slate-500 mt-1">Expenses &amp; income</span>
          </Link>

          <Link
            to="/reports"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-900">Farm Reports</span>
            <span className="text-[11px] text-slate-500 mt-1">Profitability &amp; export</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
