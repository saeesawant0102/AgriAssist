import React, { useState } from 'react';
import { Edit2, Filter, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table.jsx';

/**
 * RecordTable component displaying filtered financial records with edit/delete actions.
 * Requirements: Expense.View, Class update_record, Class delete_record
 */
export function RecordTable({
  records = [],
  filters = {},
  onFilterChange = () => {},
  onEdit = () => {},
  onDelete = () => {},
  isDeleting = false,
  currency = 'INR',
}) {
  const [recordToDelete, setRecordToDelete] = useState(null);

  const handleConfirmDelete = async () => {
    if (recordToDelete) {
      await onDelete(recordToDelete.record_id);
      setRecordToDelete(null);
    }
  };

  return (
    <Card className="overflow-hidden border border-slate-200/80 shadow-sm">
      {/* Filter toolbar */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <Select
          label="Filter by Type"
          value={filters.type || ''}
          onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
          options={[
            { value: '', label: 'All Transactions' },
            { value: 'Expense', label: 'Expenses Only' },
            { value: 'Income', label: 'Income Only' },
          ]}
        />

        <Input
          label="From Date"
          type="date"
          value={filters.from || ''}
          onChange={(e) => onFilterChange({ ...filters, from: e.target.value })}
        />

        <Input
          label="To Date"
          type="date"
          value={filters.to || ''}
          onChange={(e) => onFilterChange({ ...filters, to: e.target.value })}
        />

        {(filters.type || filters.from || filters.to) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange({ type: '', from: '', to: '' })}
            className="text-xs text-slate-500 hover:text-slate-800 self-center sm:self-end h-10"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Transactions table */}
      {records.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          No financial transactions match the selected filters.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount ({currency})</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const isIncome = record.type === 'Income';
              return (
                <TableRow key={record.record_id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono text-xs text-slate-400">
                    #{record.record_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isIncome ? 'success' : 'warning'}>
                      {record.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium">
                    {record.date}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      isIncome ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {Number(record.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-slate-600 max-w-xs truncate">
                    {record.description || '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(record)}
                      aria-label={`Edit transaction #${record.record_id}`}
                      className="p-1.5 text-slate-500 hover:text-slate-900"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRecordToDelete(record)}
                      aria-label={`Delete transaction #${record.record_id}`}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="Delete Financial Record"
        message={`Are you sure you want to delete this ${recordToDelete?.type} of ${currency} ${recordToDelete?.amount}? This action will immediately recalculate farm overall profitability.`}
        confirmText="Delete Record"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setRecordToDelete(null)}
      />
    </Card>
  );
}
