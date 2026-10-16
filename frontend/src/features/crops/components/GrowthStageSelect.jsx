import React from 'react';
import { Select } from '../../../components/ui/Select.jsx';
import { GROWTH_STAGES } from '../../../config/constants.js';

/**
 * Requirement: Crop.Stage.Update, D3
 * Dropdown selector for the 7 configured crop growth stages.
 */
export function GrowthStageSelect({
  value = 'Sowing',
  onChange,
  disabled = false,
  label = 'Growth Stage',
  error,
  helperText,
  id = 'crop-growth-stage',
  name = 'growth_stage',
}) {
  const options = GROWTH_STAGES.map((stage) => ({
    value: stage,
    label: stage,
  }));

  return (
    <Select
      id={id}
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={options}
      error={error}
      helperText={helperText}
    />
  );
}
