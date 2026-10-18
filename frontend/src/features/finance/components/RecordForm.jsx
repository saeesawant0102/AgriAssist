import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { Select } from '../../../components/ui/Select.jsx';

const recordSchema = z.object({
  type: z.enum(['Expense', 'Income']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
});

/**
 * RecordForm modal for creating or editing expense/income records.
 * Requirements: Expense.Add, Income.Add, Class update_record
 */
export function RecordForm({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  defaultType = 'Expense',
  isSubmitting = false,
  currency = 'INR',
}) {
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      type: defaultType,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        type: initialData.type || defaultType,
        amount: initialData.amount || '',
        date: initialData.date || new Date().toISOString().split('T')[0],
        description: initialData.description || '',
      });
    } else {
      reset({
        type: defaultType,
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
    }
  }, [initialData, defaultType, reset, isOpen]);

  const onFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${initialData.type} Record` : `Record ${defaultType}`}
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
        {isEditing ? (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Record Type
            </label>
            <div className="flex items-center gap-2">
              <Badge variant={initialData.type === 'Income' ? 'success' : 'warning'}>
                {initialData.type}
              </Badge>
              <span className="text-xs text-slate-400">(Type is immutable)</span>
            </div>
          </div>
        ) : (
          <Select
            label="Record Type"
            {...register('type')}
            error={errors.type?.message}
            options={[
              { value: 'Expense', label: 'Expense (Outflow)' },
              { value: 'Income', label: 'Income (Inflow)' },
            ]}
          />
        )}

        <Input
          label={`Amount (${currency})`}
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('amount')}
          error={errors.amount?.message}
        />

        <Input
          label="Transaction Date"
          type="date"
          {...register('date')}
          error={errors.date?.message}
        />

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="e.g. Fertilizer purchase, Crop harvest sale..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Record' : 'Save Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
