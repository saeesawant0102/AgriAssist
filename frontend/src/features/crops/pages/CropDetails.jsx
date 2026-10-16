import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Edit2,
  Sprout,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import { GROWTH_STAGE_COLORS, GROWTH_STAGES } from '../../../config/constants.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { deleteCropApi, getCropByIdApi, updateCropStageApi } from '../api.js';
import { GrowthStageSelect } from '../components/GrowthStageSelect.jsx';

export function CropDetails() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isFarmer = profile?.user_type === 'farmer';

  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Stage update loading
  const [stageLoading, setStageLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');

  // Delete modal state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchCrop() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCropByIdApi(cropId);
        if (isMounted) {
          setCrop(data);
          setSelectedStage(data.growth_stage);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load crop details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchCrop();
    return () => {
      isMounted = false;
    };
  }, [cropId]);

  const handleStageChange = async (e) => {
    const newStage = e.target.value;
    setSelectedStage(newStage);
    if (!newStage || newStage === crop.growth_stage) return;

    try {
      setStageLoading(true);
      const updated = await updateCropStageApi(cropId, newStage);
      setCrop(updated);
      setToastMessage({
        type: 'success',
        text: `Growth stage updated to "${newStage}".`,
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update growth stage.',
      });
      setSelectedStage(crop.growth_stage);
    } finally {
      setStageLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await deleteCropApi(cropId);
      navigate(isFarmer ? `/farms/${crop.farm_id}` : `/admin/farms/${crop.farm_id}`);
    } catch (err) {
      setError(err.message || 'Failed to delete crop');
      setConfirmDelete(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !crop) {
    return (
      <Card>
        <div className="p-8 text-center space-y-4">
          <p className="text-red-600 font-medium">{error || 'Crop not found'}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  const currentStageIndex = GROWTH_STAGES.indexOf(crop.growth_stage);
  const backUrl = isFarmer ? `/farms/${crop.farm_id}` : `/admin/farms/${crop.farm_id}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
            title="Back to Farm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {crop.crop_name}
              </h1>
              {crop.variety && (
                <Badge variant="default">{crop.variety}</Badge>
              )}
              <Badge variant={GROWTH_STAGE_COLORS[crop.growth_stage] || 'success'}>
                {crop.growth_stage}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Planted on Farm #{crop.farm_id} &bull; Sown: {crop.sowing_date}
            </p>
          </div>
        </div>

        {/* Action buttons (farmer only) */}
        {isFarmer && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Edit2 className="w-4 h-4" />}
              onClick={() => navigate(`/crops/${crop.crop_id}/edit`)}
            >
              Edit Crop
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete Crop
            </Button>
          </div>
        )}
      </div>

      {/* Growth Stage Progress Bar */}
      <Card title="Crop Growth Lifecycle (D3)">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {GROWTH_STAGES.map((stage, idx) => {
              const isCurrent = stage === crop.growth_stage;
              const isPast = idx < currentStageIndex;
              return (
                <div
                  key={stage}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 font-bold'
                      : isPast
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-white border-dashed border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex justify-center mb-1">
                    {isCurrent ? (
                      <Sprout className="w-4 h-4 text-emerald-600 animate-bounce" />
                    ) : isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300" />
                    )}
                  </div>
                  <div className="text-xs truncate">{stage}</div>
                </div>
              );
            })}
          </div>

          {/* Quick Stage Updater for Farmer */}
          {isFarmer && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-slate-700 block">
                  Advance Growth Stage
                </span>
                <span className="text-[11px] text-slate-500">
                  Selecting a new stage updates crop schedules and advisory algorithms immediately.
                </span>
              </div>
              <div className="w-full sm:w-56">
                <GrowthStageSelect
                  label=""
                  value={selectedStage}
                  onChange={handleStageChange}
                  disabled={stageLoading}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Crop Overview Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">Crop Name</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{crop.crop_name}</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">Variety / Cultivar</div>
          <div className="text-base font-semibold text-slate-900 mt-1">
            {crop.variety || 'Standard'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">Sowing Date</div>
          <div className="text-base font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>{crop.sowing_date}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs font-medium text-slate-500">Harvest Date</div>
          <div className="text-base font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>{crop.harvest_date || 'Pending'}</span>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete Crop Record"
        message={`Are you sure you want to delete crop "${crop.crop_name}"? All associated advisories and schedules will be permanently removed.`}
        confirmLabel="Confirm Delete"
        loading={deleteLoading}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
