import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Calculator,
  DollarSign,
  History,
  Layers,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table.jsx';
import { getFarmsApi } from '../../farms/api.js';
import { calculateProfitabilityApi, getProfitabilityHistoryApi } from '../api.js';
import { ExportButtons } from '../components/ExportButtons.jsx';

/**
 * Profitability page for calculating period profit/loss and viewing historical runs.
 * Requirements: Profit.Calculate, Profit.Report, BR-6, Section 12.8
 */
export function Profitability() {
  const currency = import.meta.env.VITE_CURRENCY_CODE || 'INR';

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [history, setHistory] = useState([]);
  const [latestCalc, setLatestCalc] = useState(null);

  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load farms initially
  useEffect(() => {
    async function loadFarms() {
      try {
        setLoadingFarms(true);
        setError(null);
        const data = await getFarmsApi();
        setFarms(data);
        if (data.length > 0) {
          setSelectedFarmId(String(data[0].farm_id));
        }
      } catch (err) {
        setError(err.message || 'Failed to load farms');
      } finally {
        setLoadingFarms(false);
      }
    }
    loadFarms();
  }, []);

  // Fetch profitability history when farm changes
  const loadHistory = async () => {
    if (!selectedFarmId) return;
    try {
      setLoadingHistory(true);
      setError(null);
      const data = await getProfitabilityHistoryApi(selectedFarmId);
      setHistory(data);
    } catch (err) {
      setError(err.message || 'Failed to load profitability records');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedFarmId]);

  const handleCalculate = async (e) => {
    e.preventDefault();
    if (!selectedFarmId) return;

    if (startDate && endDate && startDate > endDate) {
      setError('Start date must not be after end date.');
      return;
    }

    try {
      setCalculating(true);
      setError(null);
      setSuccessMessage(null);
      const result = await calculateProfitabilityApi(selectedFarmId, {
        start_date: startDate || null,
        end_date: endDate || null,
      });
      setLatestCalc(result);
      setSuccessMessage('Profitability calculated successfully and saved to history!');
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to calculate profitability');
    } finally {
      setCalculating(false);
    }
  };

  if (loadingFarms) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" className="text-emerald-600" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading farms...</p>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profitability Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">Calculate period-based net returns and cash profitability.</p>
        </div>
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="No farms registered"
          description="Register a farm and log financial entries to evaluate profitability."
        />
      </div>
    );
  }

  const isLoss = latestCalc && Number(latestCalc.net_profit) < 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-600" />
            Profitability Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Calculate period-based profit, track margin history, and detect operating losses.
          </p>
        </div>

        <ExportButtons
          farmId={selectedFarmId}
          dateRange={{ start_date: startDate, end_date: endDate }}
          currency={currency}
        />
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          {successMessage}
        </div>
      )}

      {/* Calculation Form Card */}
      <Card className="p-5">
        <form onSubmit={handleCalculate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <Select
            label="Target Farm"
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            options={farms.map((f) => ({
              value: String(f.farm_id),
              label: `${f.farm_name} (${f.location})`,
            }))}
          />

          <Input
            label="Start Date (Optional)"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="End Date (Optional)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <Button
            type="submit"
            disabled={calculating || !selectedFarmId}
            className="w-full h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {calculating ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Computing...</span>
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                <span>Calculate Profit</span>
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Latest Calculation Result Card */}
      {latestCalc && (
        <Card
          className={`p-6 border transition-all ${
            isLoss ? 'bg-red-50/80 border-red-200 text-red-950' : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Calculation #{latestCalc.profit_id}
                </span>
                <Badge variant={isLoss ? 'danger' : 'success'}>
                  {isLoss ? 'Net Operating Loss' : 'Net Operating Profit'}
                </Badge>
              </div>
              <h3 className="text-lg font-bold mt-1">
                Period: {latestCalc.start_date || 'Inception'} to {latestCalc.end_date || 'Present'}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase font-semibold block">Calculated Result</span>
              <span className={`text-2xl font-black ${isLoss ? 'text-red-700' : 'text-emerald-700'}`}>
                {currency} {Number(latestCalc.net_profit).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-3 bg-white/80 rounded-xl border border-black/5">
              <span className="text-xs text-slate-500 block">Total Income</span>
              <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                {currency} {Number(latestCalc.total_income).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-black/5">
              <span className="text-xs text-slate-500 block">Total Expenses</span>
              <span className="text-base font-bold text-slate-800 mt-0.5 block">
                {currency} {Number(latestCalc.total_expense).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-black/5">
              <span className="text-xs text-slate-500 block">Operating Margin (P = I - E)</span>
              <span className={`text-base font-bold mt-0.5 block ${isLoss ? 'text-red-700' : 'text-emerald-700'}`}>
                {isLoss ? '-' : '+'} {currency} {Math.abs(Number(latestCalc.net_profit)).toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Historical Calculation List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          Profitability Record History ({history.length})
        </h2>

        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Spinner size="md" className="text-emerald-600" />
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-8 h-8" />}
            title="No profitability calculations on record"
            description="Use the calculator above to generate and archive profitability evaluations."
          />
        ) : (
          <Card className="overflow-hidden border border-slate-200/80 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Total Income</TableHead>
                  <TableHead className="text-right">Total Expense</TableHead>
                  <TableHead className="text-right">Net Profit / Loss</TableHead>
                  <TableHead>Computed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => {
                  const loss = Number(row.net_profit) < 0;
                  return (
                    <TableRow key={row.profit_id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <Badge variant={row.is_overall === 1 ? 'info' : 'default'}>
                          {row.is_overall === 1 ? 'All-Time Overall' : 'Date Range'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {row.start_date || 'Inception'} &rarr; {row.end_date || 'Present'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {currency} {Number(row.total_income).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-800">
                        {currency} {Number(row.total_expense).toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          loss ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {currency} {Number(row.net_profit).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {row.date}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
