import React, { useEffect, useState } from 'react';
import { DollarSign, Layers, PlusCircle, Receipt } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { getFarmsApi } from '../../farms/api.js';
import {
  addExpenseApi,
  addIncomeApi,
  deleteFinancialRecordApi,
  getFinancialRecordsApi,
  getFinancialSummaryApi,
  updateFinancialRecordApi,
} from '../api.js';
import { ExportButtons } from '../components/ExportButtons.jsx';
import { RecordForm } from '../components/RecordForm.jsx';
import { RecordTable } from '../components/RecordTable.jsx';
import { SummaryCards } from '../components/SummaryCards.jsx';

/**
 * Finance page for managing farm expenses, income, summaries, and exports.
 * Requirements: Expense.Add, Income.Add, Expense.View, BR-6, Section 12.8
 */
export function Finance() {
  const currency = import.meta.env.VITE_CURRENCY_CODE || 'INR';

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ type: '', from: '', to: '' });

  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal form state
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState('Expense');
  const [editingRecord, setEditingRecord] = useState(null);

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

  // Fetch records and summary when farm or filters change
  const refreshFinancialData = async () => {
    if (!selectedFarmId) return;
    try {
      setLoadingData(true);
      setError(null);
      const [recordsData, summaryData] = await Promise.all([
        getFinancialRecordsApi(selectedFarmId, filters),
        getFinancialSummaryApi(selectedFarmId, {
          start_date: filters.from,
          end_date: filters.to,
        }),
      ]);
      setRecords(recordsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || 'Failed to load financial records');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    refreshFinancialData();
  }, [selectedFarmId, filters]);

  const handleOpenAddExpense = () => {
    setEditingRecord(null);
    setFormType('Expense');
    setFormOpen(true);
  };

  const handleOpenAddIncome = () => {
    setEditingRecord(null);
    setFormType('Income');
    setFormOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setFormType(record.type);
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      if (editingRecord) {
        await updateFinancialRecordApi(editingRecord.record_id, {
          amount: formData.amount,
          date: formData.date,
          description: formData.description,
        });
        setSuccessMessage('Record updated and overall profitability recalculated!');
      } else if (formData.type === 'Income') {
        await addIncomeApi(selectedFarmId, {
          amount: formData.amount,
          date: formData.date,
          description: formData.description,
        });
        setSuccessMessage('Income recorded and overall profitability recalculated!');
      } else {
        await addExpenseApi(selectedFarmId, {
          amount: formData.amount,
          date: formData.date,
          description: formData.description,
        });
        setSuccessMessage('Expense recorded and overall profitability recalculated!');
      }

      setFormOpen(false);
      await refreshFinancialData();
    } catch (err) {
      setError(err.message || 'Failed to save financial record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (recordId) => {
    try {
      setIsDeleting(true);
      setError(null);
      setSuccessMessage(null);
      await deleteFinancialRecordApi(recordId);
      setSuccessMessage('Record deleted and overall profitability updated.');
      await refreshFinancialData();
    } catch (err) {
      setError(err.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loadingFarms) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" className="text-emerald-600" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading financial accounts...</p>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finance &amp; Profitability</h1>
          <p className="text-sm text-slate-500 mt-1">Track crop input costs, harvest income, and farm profitability.</p>
        </div>
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="No farms registered"
          description="Register a farm first to begin recording income, expenses, and calculating profit."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Farm Financials &amp; Cash Flow
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track farm expenses and crop sales, and generate accounting reports.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenAddExpense}
            className="gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <PlusCircle className="w-4 h-4 text-amber-600" />
            <span>Record Expense</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAddIncome}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Income</span>
          </Button>
        </div>
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

      {/* Farm Selector & Export Bar */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="w-full md:w-80">
            <Select
              label="Select Farm"
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              options={farms.map((f) => ({
                value: String(f.farm_id),
                label: `${f.farm_name} (${f.location})`,
              }))}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Export Filtered Report:
            </span>
            <ExportButtons
              farmId={selectedFarmId}
              dateRange={{ start_date: filters.from, end_date: filters.to }}
              currency={currency}
            />
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <SummaryCards
        totalIncome={summary?.total_income ?? 0}
        totalExpense={summary?.total_expense ?? 0}
        netProfit={summary?.net_profit ?? 0}
        recordCount={summary?.record_count ?? records.length}
        currency={currency}
      />

      {/* Transactions Table */}
      {loadingData ? (
        <div className="flex flex-col items-center justify-center p-12">
          <Spinner size="md" className="text-emerald-600" />
          <p className="mt-2 text-xs text-slate-500">Loading transactions...</p>
        </div>
      ) : (
        <RecordTable
          records={records}
          filters={filters}
          onFilterChange={setFilters}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          currency={currency}
        />
      )}

      {/* Modal Form for Add/Edit */}
      <RecordForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingRecord}
        defaultType={formType}
        isSubmitting={isSubmitting}
        currency={currency}
      />
    </div>
  );
}
