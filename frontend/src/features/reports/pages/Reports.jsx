import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Layers, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Table } from '../../../components/ui/Table.jsx';
import { getProfitabilityReportsApi } from '../api.js';

export function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currencyCode = import.meta.env.VITE_CURRENCY_CODE || 'INR';
  const areaUnit = import.meta.env.VITE_AREA_UNIT || 'hectares';

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        setError(null);
        const data = await getProfitabilityReportsApi();
        setReports(data);
      } catch (err) {
        setError(err.message || 'Failed to load profitability reports');
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
      header: 'Farm Name',
      render: (_, row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.farm_name}</span>
          <span className="text-xs text-slate-500">{row.location}</span>
        </div>
      ),
    },
    {
      key: 'area',
      header: `Area (${areaUnit})`,
      render: (val) => <span className="text-sm text-slate-700">{val}</span>,
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
      header: 'Last Calculated',
      render: (val) => (
        <span className="text-xs text-slate-500">{val || 'No calculations yet'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Link to={`/farms/${row.farm_id}`}>
            <Button variant="ghost" size="sm">
              Farm Details
            </Button>
          </Link>
          <Link to="/finance/profitability">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <span>Financials</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Farm Profitability Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overall profitability summaries across all farms registered under your account.
          </p>
        </div>
        <div>
          <Link to="/finance">
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Record Finances</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Aggregate Totals Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Revenue
          </span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {currencyCode} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Expenses
          </span>
          <div className="mt-2 text-2xl font-extrabold text-slate-800">
            {currencyCode} {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Combined Net Profit
          </span>
          <div
            className={`mt-2 text-2xl font-extrabold flex items-center gap-2 ${
              isOverallProfitable ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {isOverallProfitable ? (
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-600" />
            )}
            <span>
              {currencyCode} {totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </Card>
      </div>

      {/* Farm Reports Table */}
      <Card title="Farm Summaries">
        {reports.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Layers className="w-12 h-12 text-slate-300" />}
              title="No farms registered"
              description="Add your first farm to track crops and view financial profitability."
              action={
                <Link to="/farms/new">
                  <Button variant="primary" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Farm</span>
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <Table columns={columns} data={reports} keyField="farm_id" />
        )}
      </Card>
    </div>
  );
}
