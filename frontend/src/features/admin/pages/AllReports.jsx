import React, { useEffect, useState } from 'react';
import { BarChart3, DollarSign, Layers, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Table } from '../../../components/ui/Table.jsx';
import { getAdminReportsApi } from '../api.js';

export function AllReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currencyCode = import.meta.env.VITE_CURRENCY_CODE || 'INR';

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminReportsApi();
        setReports(data);
      } catch (err) {
        setError(err.message || 'Failed to load system reports');
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const totalIncome = reports.reduce((sum, r) => sum + (Number(r.total_income) || 0), 0);
  const totalExpense = reports.reduce((sum, r) => sum + (Number(r.total_expense) || 0), 0);
  const totalNetProfit = totalIncome - totalExpense;
  const isOverallProfitable = totalNetProfit >= 0;

  const columns = [
    {
      key: 'farm_name',
      header: 'Farm & Location',
      render: (_, row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.farm_name}</span>
          <span className="text-xs text-slate-500">{row.location}</span>
        </div>
      ),
    },
    {
      key: 'farmer_name',
      header: 'Farmer Account',
      render: (_, row) => (
        <div>
          <span className="font-semibold text-slate-800 block">{row.farmer_name}</span>
          <span className="text-xs text-slate-500">{row.farmer_email}</span>
        </div>
      ),
    },
    {
      key: 'total_income',
      header: `Total Income (${currencyCode})`,
      render: (val) => (
        <span className="text-sm font-medium text-emerald-700">
          {Number(val || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'total_expense',
      header: `Total Expense (${currencyCode})`,
      render: (val) => (
        <span className="text-sm font-medium text-slate-700">
          {Number(val || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'net_profit',
      header: `Net Profit (${currencyCode})`,
      render: (val) => {
        const profit = Number(val || 0);
        const isPos = profit >= 0;
        return (
          <Badge variant={isPos ? 'success' : 'danger'}>
            {profit.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Badge>
        );
      },
    },
    {
      key: 'date',
      header: 'Calculation Date',
      render: (val) => (
        <span className="text-xs text-slate-500">{val || 'N/A'}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          System Profitability Reports
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Read-only overview of overall financial profitability across all farms and registered farmers.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Aggregate Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Farms Reporting
          </span>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {reports.length}
          </div>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            System Total Revenue
          </span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {currencyCode} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            System Total Expenses
          </span>
          <div className="mt-2 text-2xl font-extrabold text-slate-800">
            {currencyCode} {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            System Net Profit
          </span>
          <div
            className={`mt-2 text-2xl font-extrabold flex items-center gap-2 ${
              isOverallProfitable ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {isOverallProfitable ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span>
              {currencyCode} {totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </Card>
      </div>

      {/* Reports Table */}
      <Card title="Farm Profitability Records">
        {reports.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<BarChart3 className="w-12 h-12 text-slate-300" />}
              title="No profitability reports recorded"
              description="No financial profitability records have been calculated for any farms yet."
            />
          </div>
        ) : (
          <Table columns={columns} data={reports} keyField="farm_id" />
        )}
      </Card>
    </div>
  );
}
