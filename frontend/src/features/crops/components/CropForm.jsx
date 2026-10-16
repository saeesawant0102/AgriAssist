import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { GrowthStageSelect } from './GrowthStageSelect.jsx';

/**
 * Requirement: Crop.Add, Crop.Edit, D1, D3
 * Form component for creating or editing crops.
 */
export function CropForm({
  initialValues = {},
  onSubmit,
  loading = false,
  submitLabel = 'Save Crop',
  onCancel,
}) {
  const [formData, setFormData] = useState({
    crop_name: initialValues.crop_name || '',
    variety: initialValues.variety || '',
    sowing_date: initialValues.sowing_date || '',
    harvest_date: initialValues.harvest_date || '',
    growth_stage: initialValues.growth_stage || 'Sowing',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.crop_name.trim()) {
      newErrors.crop_name = 'Crop name is required';
    } else if (formData.crop_name.trim().length > 100) {
      newErrors.crop_name = 'Crop name cannot exceed 100 characters';
    }

    if (formData.variety && formData.variety.trim().length > 100) {
      newErrors.variety = 'Variety cannot exceed 100 characters';
    }

    if (!formData.sowing_date) {
      newErrors.sowing_date = 'Sowing date is required';
    }

    if (formData.harvest_date && formData.sowing_date) {
      if (formData.harvest_date < formData.sowing_date) {
        newErrors.harvest_date = 'Harvest date must be on or after sowing date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        crop_name: formData.crop_name.trim(),
        variety: formData.variety.trim() || null,
        sowing_date: formData.sowing_date,
        harvest_date: formData.harvest_date || null,
        growth_stage: formData.growth_stage,
      };

      await onSubmit(payload);
    } catch (err) {
      setServerError(err.message || 'Failed to save crop details.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
          <span className="font-semibold">Error:</span>
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="crop-name"
          name="crop_name"
          label="Crop Name"
          required
          placeholder="e.g. Wheat, Sugarcane, Cotton"
          value={formData.crop_name}
          onChange={handleChange}
          error={errors.crop_name}
        />

        <Input
          id="crop-variety"
          name="variety"
          label="Crop Variety (Optional)"
          placeholder="e.g. Sharbati, Bt Cotton, JS 335"
          value={formData.variety}
          onChange={handleChange}
          error={errors.variety}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="crop-sowing-date"
          name="sowing_date"
          label="Sowing Date"
          type="date"
          required
          value={formData.sowing_date}
          onChange={handleChange}
          error={errors.sowing_date}
        />

        <Input
          id="crop-harvest-date"
          name="harvest_date"
          label="Estimated Harvest Date (Optional)"
          type="date"
          value={formData.harvest_date}
          onChange={handleChange}
          error={errors.harvest_date}
          helperText="Must be on or after the sowing date"
        />
      </div>

      <GrowthStageSelect
        id="crop-stage"
        name="growth_stage"
        label="Current Growth Stage"
        value={formData.growth_stage}
        onChange={handleChange}
        helperText="Used to generate stage-specific crop advisories and irrigation recommendations"
      />

      <div className="flex items-center justify-end gap-3 pt-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
