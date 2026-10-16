import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Filter, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Table } from '../../../components/ui/Table.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import { createFarmApi, deleteFarmApi, getFarmsApi } from '../../farms/api.js';
import { FarmForm } from '../../farms/components/FarmForm.jsx';

export function AdminFarms() {
  const navigate = useNavigate();
  const areaUnit = import.meta.env.VITE_AREA_UNIT || 'acres';

  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [farmerFilter, setFarmerFilter] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Add farm on behalf modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Delete modal state
  const [farmToDelete, setFarmToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFarms = async (filterId = null) => {
    try {
      setLoading(true);
      setError(null);
      const params = filterId ? { farmer_id: filterId } : {};
      const data = await getFarmsApi(params);
      setFarms(data);
    } catch (err) {
      setError(err.message || 'Failed to load farms list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchFarms(farmerFilter.trim() || null);
  };

  const handleClearFilter = () => {
    setFarmerFilter('');
    fetchFarms(null);
  };

  const handleAddSubmit = async (payload) => {
    try {
      setAddLoading(true);
      await createFarmApi(payload);
      setIsAddModalOpen(false);
      setToastMessage({
        type: 'success',
        text: `Farm "${payload.farm_name}" created successfully on behalf of farmer #${payload.farmer_id}.`,
      });
      await fetchFarms(farmerFilter.trim() || null);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!farmToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteFarmApi(farmToDelete.farm_id);
      setToastMessage({
        type: 'success',
        text: `Farm #${farmToDelete.farm_id} deleted successfully.`,
      });
      setFarmToDelete(null);
      await fetchFarms(farmerFilter.trim() || null);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to delete farm.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      key: 'farm_id',
      header: 'Farm ID',
      render: (val) => <span className="font-mono text-xs text-slate-500">#{val}</span>,
    },
    {
      key: 'farmer_id',
      header: 'Farmer ID',
      render: (val) => (
        <Badge variant="default" className="font-mono">
          Farmer #{val}
        </Badge>
      ),
    },
    {
      key: 'farm_name',
      header: 'Farm Name',
      render: (val) => (
        <div className="font-medium text-slate-900">{val}</div>
      ),
    },
    {
      key: 'location',
      header: 'Location & GPS',
      render: (val, farm) => (
        <div>
          <div className="text-slate-800">{val}</div>
          <div className="text-[11px] text-slate-400">
            {Number(farm.latitude).toFixed(4)}&deg;N, {Number(farm.longitude).toFixed(4)}&deg;E
          </div>
        </div>
      ),
    },
    {
      key: 'area',
      header: `Area (${areaUnit})`,
      render: (val) => (
        <span className="font-semibold text-slate-900">
          {val} {areaUnit}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, farm) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 text-slate-600 hover:text-emerald-700"
            title="View Details"
            onClick={() => navigate(`/admin/farms/${farm.farm_id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Delete Farm"
            onClick={() => setFarmToDelete(farm)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Farm Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            System-wide overview of all registered agricultural parcels.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add on Behalf of Farmer
        </Button>
      </div>

      {/* Filter toolbar */}
      <Card className="p-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          <div className="flex-1 w-full sm:max-w-xs">
            <Input
              id="admin-farmer-filter"
              name="farmerFilter"
              label="Filter by Farmer ID"
              placeholder="e.g. 1"
              type="number"
              value={farmerFilter}
              onChange={(e) => setFarmerFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary" size="md" icon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
            {farmerFilter && (
              <Button type="button" variant="ghost" size="md" onClick={handleClearFilter}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Farms Table */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card>
          <div className="p-6 text-center text-red-600 space-y-3">
            <p className="font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchFarms(farmerFilter || null)}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table
            columns={columns}
            data={farms}
            emptyMessage="No farm records found."
          />
        </Card>
      )}

      {/* Modal: Add Farm on Behalf */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Farm on Behalf of Farmer"
      >
        <FarmForm
          isAdmin={true}
          onSubmit={handleAddSubmit}
          loading={addLoading}
          submitLabel="Create Farm"
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Modal: Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(farmToDelete)}
        title="Delete Farm (Administrator)"
        message={`Are you sure you want to delete farm #${farmToDelete?.farm_id} ("${farmToDelete?.farm_name}")? This action will cascade delete all linked crops and advisories.`}
        confirmLabel="Delete Farm"
        loading={deleteLoading}
        onClose={() => setFarmToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
