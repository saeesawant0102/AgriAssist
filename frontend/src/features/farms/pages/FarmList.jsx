import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit2, Eye, MapPin, Plus, Sprout, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import { deleteFarmApi, getFarmsApi } from '../api.js';

export function FarmList() {
  const navigate = useNavigate();
  const areaUnit = import.meta.env.VITE_AREA_UNIT || 'acres';

  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Deletion modal state
  const [farmToDelete, setFarmToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFarms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFarmsApi();
      setFarms(data);
    } catch (err) {
      setError(err.message || 'Failed to load farms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!farmToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteFarmApi(farmToDelete.farm_id);
      setToastMessage({
        type: 'success',
        text: `Farm "${farmToDelete.farm_name}" deleted successfully.`,
      });
      setFarmToDelete(null);
      await fetchFarms();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to delete farm.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Farms</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your registered agricultural land, coordinates, and crop plots.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/farms/new')}
        >
          Add Farm
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card>
          <div className="p-4 text-center text-red-600 space-y-3">
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchFarms}>
              Retry
            </Button>
          </div>
        </Card>
      ) : farms.length === 0 ? (
        <Card>
          <EmptyState
            title="No farms registered yet"
            description="Add your first farm plot to begin monitoring weather, receiving crop advisory, and scheduling irrigation."
            actionLabel="Add Farm"
            onAction={() => navigate('/farms/new')}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <Card key={farm.farm_id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 line-clamp-1">
                    {farm.farm_name}
                  </h2>
                  <Badge variant="success">
                    {farm.area} {areaUnit}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{farm.location}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pl-5">
                    GPS: {Number(farm.latitude).toFixed(4)}&deg;N, {Number(farm.longitude).toFixed(4)}&deg;E
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  to={`/farms/${farm.farm_id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </Link>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1.5 text-slate-500 hover:text-slate-800"
                    title="Edit Farm"
                    onClick={() => navigate(`/farms/${farm.farm_id}/edit`)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete Farm"
                    onClick={() => setFarmToDelete(farm)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(farmToDelete)}
        title="Delete Farm Plot"
        message={`Are you sure you want to delete "${farmToDelete?.farm_name}"? All associated crops, advisories, and records will be permanently removed.`}
        confirmLabel="Delete Farm"
        loading={deleteLoading}
        onClose={() => setFarmToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
