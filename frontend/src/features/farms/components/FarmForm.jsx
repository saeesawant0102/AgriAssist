import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';

/**
 * Requirement: Farm.Add, Farm.Edit, Farm.Validate, BR-1, BR-2
 * Form component for adding or editing farm details.
 */
export function FarmForm({
  initialValues = {},
  onSubmit,
  loading = false,
  submitLabel = 'Save Farm',
  isAdmin = false,
  onCancel,
}) {
  const areaUnit = import.meta.env.VITE_AREA_UNIT || 'acres';

  const [formData, setFormData] = useState({
    farm_name: initialValues.farm_name || '',
    location: initialValues.location || '',
    area: initialValues.area !== undefined && initialValues.area !== null ? String(initialValues.area) : '',
    farmer_id: initialValues.farmer_id !== undefined && initialValues.farmer_id !== null ? String(initialValues.farmer_id) : '',
    latitude:
      initialValues.latitude !== undefined && initialValues.latitude !== null
        ? String(initialValues.latitude)
        : '',
    longitude:
      initialValues.longitude !== undefined && initialValues.longitude !== null
        ? String(initialValues.longitude)
        : '',
  });

  const [hasManualCoords, setHasManualCoords] = useState(
    Boolean(initialValues.latitude !== undefined && initialValues.latitude !== null && initialValues.latitude !== '')
  );

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

    if (!formData.farm_name.trim()) {
      newErrors.farm_name = 'Farm name is required';
    } else if (formData.farm_name.trim().length > 100) {
      newErrors.farm_name = 'Farm name cannot exceed 100 characters';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    } else if (formData.location.trim().length > 255) {
      newErrors.location = 'Location cannot exceed 255 characters';
    }

    const areaNum = parseFloat(formData.area);
    if (!formData.area || isNaN(areaNum) || areaNum <= 0) {
      newErrors.area = `Area must be a positive number greater than zero`;
    }

    if (isAdmin && !formData.farmer_id) {
      newErrors.farmer_id = 'Farmer ID is required for administrative creation';
    }

    if (hasManualCoords) {
      if (formData.latitude !== '') {
        const lat = parseFloat(formData.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          newErrors.latitude = 'Latitude must be between -90 and 90';
        }
      }
      if (formData.longitude !== '') {
        const lon = parseFloat(formData.longitude);
        if (isNaN(lon) || lon < -180 || lon > 180) {
          newErrors.longitude = 'Longitude must be between -180 and 180';
        }
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
        farm_name: formData.farm_name.trim(),
        location: formData.location.trim(),
        area: parseFloat(formData.area),
      };

      if (isAdmin && formData.farmer_id) {
        payload.farmer_id = parseInt(formData.farmer_id, 10);
      }

      if (hasManualCoords && formData.latitude !== '' && formData.longitude !== '') {
        payload.latitude = parseFloat(formData.latitude);
        payload.longitude = parseFloat(formData.longitude);
      }

      await onSubmit(payload);
    } catch (err) {
      if (err.code === 'LOCATION_NOT_FOUND') {
        setServerError('Location could not be geocoded. Please enter a recognized town/region or specify coordinates manually.');
        setHasManualCoords(true);
      } else if (err.code === 'WEATHER_UNAVAILABLE') {
        setServerError('Geocoding service is temporarily unavailable. Please enter coordinates manually.');
        setHasManualCoords(true);
      } else {
        setServerError(err.message || 'Failed to save farm details. Please check your inputs.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {serverError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
          <span className="font-semibold">Error:</span>
          <span>{serverError}</span>
        </div>
      )}

      {isAdmin && (
        <Input
          id="farm-farmer-id"
          name="farmer_id"
          label="Target Farmer ID"
          type="number"
          required
          placeholder="e.g. 1"
          value={formData.farmer_id}
          onChange={handleChange}
          error={errors.farmer_id}
          helperText="Specify the numeric ID of the farmer who owns this farm"
        />
      )}

      <Input
        id="farm-name"
        name="farm_name"
        label="Farm Name"
        required
        placeholder="e.g. Sunflower Meadows"
        value={formData.farm_name}
        onChange={handleChange}
        error={errors.farm_name}
      />

      <Input
        id="farm-location"
        name="location"
        label="Location (City, Region, or Village)"
        required
        placeholder="e.g. Nashik, Maharashtra"
        value={formData.location}
        onChange={handleChange}
        error={errors.location}
        helperText="Used to fetch localized weather forecast and crop advisories"
      />

      <Input
        id="farm-area"
        name="area"
        label={`Farm Area (${areaUnit})`}
        type="number"
        step="any"
        required
        placeholder={`e.g. 12.5`}
        value={formData.area}
        onChange={handleChange}
        error={errors.area}
        helperText={`Total land area in ${areaUnit} (must be > 0)`}
      />

      {/* Manual coordinates collapsible */}
      <div className="pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setHasManualCoords(!hasManualCoords)}
          className="flex items-center justify-between w-full py-2 text-sm font-medium text-slate-700 hover:text-emerald-700 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Custom GPS Coordinates (Optional)</span>
          </div>
          {hasManualCoords ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {hasManualCoords && (
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
            <p className="text-xs text-slate-500">
              Leave blank to automatically geocode from the location name above.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="farm-latitude"
                name="latitude"
                label="Latitude"
                type="number"
                step="any"
                placeholder="e.g. 19.9975"
                value={formData.latitude}
                onChange={handleChange}
                error={errors.latitude}
                helperText="Between -90 and 90"
              />
              <Input
                id="farm-longitude"
                name="longitude"
                label="Longitude"
                type="number"
                step="any"
                placeholder="e.g. 73.7898"
                value={formData.longitude}
                onChange={handleChange}
                error={errors.longitude}
                helperText="Between -180 and 180"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
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
