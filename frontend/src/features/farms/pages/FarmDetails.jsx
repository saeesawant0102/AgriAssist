import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CloudSun,
  Edit2,
  ExternalLink,
  MapPin,
  Maximize2,
  Plus,
  Sprout,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { deleteFarmApi, getFarmByIdApi } from '../api.js';

export function FarmDetails() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isFarmer = profile?.user_type === 'farmer';
  const areaUnit = import.meta.env.VITE_AREA_UNIT || 'acres';

  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchFarm() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFarmByIdApi(farmId);
        if (isMounted) setFarm(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load farm details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchFarm();
    return () => {
      isMounted = false;
    };
  }, [farmId]);

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await deleteFarmApi(farmId);
      navigate(isFarmer ? '/farms' : '/admin/farms');
    } catch (err) {
      setError(err.message || 'Failed to delete farm');
      setConfirmDelete(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const backUrl = isFarmer ? '/farms' : '/admin/farms';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !farm) {
    return (
      <Card>
        <div className="p-8 text-center space-y-4">
          <p className="text-red-600 font-medium">{error || 'Farm not found'}</p>
          <Button variant="outline" onClick={() => navigate(backUrl)}>
            Back to Farms
          </Button>
        </div>
      </Card>
    );
  }

  const mapUrl = `https://www.openstreetmap.org/?mlat=${farm.latitude}&mlon=${farm.longitude}#map=15/${farm.latitude}/${farm.longitude}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="p-1.5"
            onClick={() => navigate(backUrl)}
            title="Back to Farms"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {farm.farm_name}
              </h1>
              <Badge variant="success">
                {farm.area} {areaUnit}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{farm.location}</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Requirement: Section 5 D6 - Farmers can edit; Admins cannot */}
          {isFarmer && (
            <Button
              variant="outline"
              size="sm"
              icon={<Edit2 className="w-4 h-4" />}
              onClick={() => navigate(`/farms/${farm.farm_id}/edit`)}
            >
              Edit Farm
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete Farm
          </Button>
        </div>
      </div>

      {/* Farm Overview Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">Total Land Area</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {farm.area} <span className="text-sm font-normal text-slate-600">{areaUnit}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">Location</div>
          <div className="text-base font-semibold text-slate-900 mt-1 truncate">
            {farm.location}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">GPS Coordinates</div>
          <div className="text-sm font-semibold text-slate-900 mt-1 flex items-center justify-between">
            <span>
              {Number(farm.latitude).toFixed(4)}&deg;N, {Number(farm.longitude).toFixed(4)}&deg;E
            </span>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-700 p-1"
              title="Open Map"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">Registered On</div>
          <div className="text-sm font-semibold text-slate-900 mt-1">
            {farm.created_at ? new Date(farm.created_at).toLocaleDateString() : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Crops Section (Placeholder for Phase 3) */}
      <Card
        title="Planted Crops"
        action={
          isFarmer ? (
            <Button variant="outline" size="sm" icon={<Plus className="w-3.5 h-3.5" />} disabled>
              Plant Crop
            </Button>
          ) : null
        }
      >
        <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <Sprout className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-75" />
          <p className="text-sm font-medium text-slate-700">No active crops registered for this farm</p>
          <p className="text-xs text-slate-500 mt-1">
            Crop lifecycle management, sowing dates, and growth stages will be enabled in Phase 3.
          </p>
        </div>
      </Card>

      {/* Weather & Advisory Section (Placeholder for Phase 4) */}
      <Card title="Weather & Advisory">
        <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <CloudSun className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-75" />
          <p className="text-sm font-medium text-slate-700">Live 7-Day Forecast &amp; Advisory</p>
          <p className="text-xs text-slate-500 mt-1">
            Live weather forecast and advisory generated from coordinates ({Number(farm.latitude).toFixed(2)}&deg;N, {Number(farm.longitude).toFixed(2)}&deg;E) will be enabled in Phase 4.
          </p>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete Farm Plot"
        message={`Are you sure you want to permanently delete "${farm.farm_name}"? All future records associated with this parcel will be removed.`}
        confirmLabel="Confirm Delete"
        loading={deleteLoading}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
