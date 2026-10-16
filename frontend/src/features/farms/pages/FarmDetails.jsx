import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CloudSun,
  Edit2,
  ExternalLink,
  Eye,
  MapPin,
  Plus,
  Sprout,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Table } from '../../../components/ui/Table.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import { GROWTH_STAGE_COLORS } from '../../../config/constants.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import {
  createCropApi,
  deleteCropApi,
  getCropsByFarmApi,
} from '../../crops/api.js';
import { CropForm } from '../../crops/components/CropForm.jsx';
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
  const [toastMessage, setToastMessage] = useState(null);

  // Farm delete modal state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Crops state
  const [crops, setCrops] = useState([]);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [isAddCropModalOpen, setIsAddCropModalOpen] = useState(false);
  const [addCropLoading, setAddCropLoading] = useState(false);
  const [cropToDelete, setCropToDelete] = useState(null);
  const [deleteCropLoading, setDeleteCropLoading] = useState(false);

  const loadCrops = async () => {
    try {
      setCropsLoading(true);
      const data = await getCropsByFarmApi(farmId);
      setCrops(data);
    } catch (err) {
      console.error('Failed to load crops:', err);
    } finally {
      setCropsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchFarm() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFarmByIdApi(farmId);
        if (isMounted) {
          setFarm(data);
          await loadCrops();
        }
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

  const handleDeleteFarm = async () => {
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

  const handleAddCropSubmit = async (payload) => {
    try {
      setAddCropLoading(true);
      await createCropApi(farmId, payload);
      setIsAddCropModalOpen(false);
      setToastMessage({
        type: 'success',
        text: `Crop "${payload.crop_name}" planted successfully.`,
      });
      await loadCrops();
    } finally {
      setAddCropLoading(false);
    }
  };

  const handleDeleteCropConfirm = async () => {
    if (!cropToDelete) return;
    try {
      setDeleteCropLoading(true);
      await deleteCropApi(cropToDelete.crop_id);
      setToastMessage({
        type: 'success',
        text: `Crop "${cropToDelete.crop_name}" deleted successfully.`,
      });
      setCropToDelete(null);
      await loadCrops();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to delete crop.',
      });
    } finally {
      setDeleteCropLoading(false);
    }
  };

  const backUrl = isFarmer ? '/farms' : '/admin/farms';
  const cropViewUrl = (cropId) => (isFarmer ? `/crops/${cropId}` : `/admin/crops/${cropId}`);

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

  const cropColumns = [
    {
      key: 'crop_name',
      header: 'Crop & Variety',
      render: (val, crop) => (
        <div>
          <div className="font-semibold text-slate-900">{val}</div>
          {crop.variety && (
            <div className="text-xs text-slate-500 font-normal">{crop.variety}</div>
          )}
        </div>
      ),
    },
    {
      key: 'sowing_date',
      header: 'Sown Date',
      render: (val) => (
        <span className="text-xs text-slate-600 font-medium">{val}</span>
      ),
    },
    {
      key: 'harvest_date',
      header: 'Estimated Harvest',
      render: (val) => (
        <span className="text-xs text-slate-600">{val || '—'}</span>
      ),
    },
    {
      key: 'growth_stage',
      header: 'Growth Stage',
      render: (val) => (
        <Badge variant={GROWTH_STAGE_COLORS[val] || 'success'}>{val}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, crop) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 text-slate-600 hover:text-emerald-700"
            title="View Crop Details"
            onClick={() => navigate(cropViewUrl(crop.crop_id))}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {isFarmer && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 text-slate-500 hover:text-slate-800"
                title="Edit Crop"
                onClick={() => navigate(`/crops/${crop.crop_id}/edit`)}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Delete Crop"
                onClick={() => setCropToDelete(crop)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}

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

      {/* Crops Section (Feature 3) */}
      <Card
        title="Planted Crops"
        action={
          isFarmer ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddCropModalOpen(true)}
            >
              Plant Crop
            </Button>
          ) : null
        }
      >
        {cropsLoading ? (
          <div className="flex justify-center items-center py-10">
            <Spinner size="md" />
          </div>
        ) : crops.length === 0 ? (
          <EmptyState
            title="No active crops registered"
            description="Register your first crop parcel to track growth stages, calculate irrigation requirements, and receive advisories."
            actionLabel={isFarmer ? 'Plant Crop' : undefined}
            onAction={isFarmer ? () => setIsAddCropModalOpen(true) : undefined}
          />
        ) : (
          <div className="overflow-hidden p-0 -mx-6 -mb-6">
            <Table
              columns={cropColumns}
              data={crops}
              emptyMessage="No crops found."
            />
          </div>
        )}
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

      {/* Modal: Plant Crop */}
      <Modal
        isOpen={isAddCropModalOpen}
        onClose={() => setIsAddCropModalOpen(false)}
        title="Plant New Crop"
      >
        <CropForm
          onSubmit={handleAddCropSubmit}
          loading={addCropLoading}
          submitLabel="Plant Crop"
          onCancel={() => setIsAddCropModalOpen(false)}
        />
      </Modal>

      {/* Farm Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete Farm Plot"
        message={`Are you sure you want to permanently delete "${farm.farm_name}"? All associated crops and future records will be removed.`}
        confirmLabel="Confirm Delete"
        loading={deleteLoading}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteFarm}
      />

      {/* Crop Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(cropToDelete)}
        title="Delete Crop"
        message={`Are you sure you want to delete "${cropToDelete?.crop_name}"? All associated growth stage records will be removed.`}
        confirmLabel="Delete Crop"
        loading={deleteCropLoading}
        onClose={() => setCropToDelete(null)}
        onConfirm={handleDeleteCropConfirm}
      />
    </div>
  );
}
