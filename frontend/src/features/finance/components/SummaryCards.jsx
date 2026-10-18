import React from 'react';
import { TrendingDown, TrendingUp, DollarSign, Receipt, AlertCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card.jsx';

/**
 * SummaryCards displaying financial aggregation metrics.
 * Requirement: BR-6, View Financial Summary, Section 13.4
 */
export function SummaryCards({
  totalIncome = 0,
  totalExpense = 0,
  netProfit = 0,
  recordCount = 0,
  currency = 'INR',
}) {
  const isLoss = Number(netProfit) < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Income */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Income
            </span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">
              {currency} {Number(totalIncome).toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </Card>

      {/* Total Expense */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Expenses
            </span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              {currency} {Number(totalExpense).toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </Card>

      {/* Net Profit / Net Loss */}
      <Card
        className={`p-4 border shadow-sm ${
          isLoss
            ? 'bg-red-50/70 border-red-200/80'
            : 'bg-emerald-50/70 border-emerald-200/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span
              className={`text-xs font-semibold uppercase tracking-wider block ${
                isLoss ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {isLoss ? 'Net Loss' : 'Net Profit'}
            </span>
            <span
              className={`text-xl font-bold mt-1 block ${
                isLoss ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {currency} {Number(netProfit).toFixed(2)}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isLoss ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isLoss ? <TrendingDown className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
          </div>
        </div>
      </Card>

      {/* Record Count */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Transactions
            </span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              {recordCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </div>
  );
}
