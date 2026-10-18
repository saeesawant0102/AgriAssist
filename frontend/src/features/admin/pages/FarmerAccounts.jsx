import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Filter,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Table } from '../../../components/ui/Table.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import {
  deleteAdminUserApi,
  getAdminUsersApi,
  updateAdminUserStatusApi,
} from '../api.js';

export function FarmerAccounts() {
  const [farmers, setFarmers] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]); // for backtracking
  const [currentCursor, setCurrentCursor] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Status toggle confirmation
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Deletion confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFarmers = async (cursor = null, status = statusFilter) => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit };
      if (status) params.status = status;
      if (cursor) params.cursor = cursor;

      const res = await getAdminUsersApi(params);
      setFarmers(res.data || []);
      setNextCursor(res.next_cursor || null);
    } catch (err) {
      setError(err.message || 'Failed to load farmer accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentCursor(null);
    setCursorHistory([]);
    fetchFarmers(null, statusFilter);
  }, [statusFilter, limit]);

  const handleNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, currentCursor]);
    setCurrentCursor(nextCursor);
    fetchFarmers(nextCursor, statusFilter);
  };

  const handleResetPagination = () => {
    setCurrentCursor(null);
    setCursorHistory([]);
    fetchFarmers(null, statusFilter);
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget) return;
    try {
      setStatusLoading(true);
      const newStatus = statusTarget.status === 'active' ? 'disabled' : 'active';
      await updateAdminUserStatusApi(statusTarget.user_id, newStatus);
      setToastMessage({
        type: 'success',
        text: `Farmer account #${statusTarget.user_id} (${statusTarget.name}) successfully ${
          newStatus === 'active' ? 'enabled' : 'disabled'
        }.`,
      });
      setStatusTarget(null);
      await fetchFarmers(currentCursor, statusFilter);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update account status.',
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteAdminUserApi(deleteTarget.user_id);
      setToastMessage({
        type: 'success',
        text: `Farmer account #${deleteTarget.user_id} (${deleteTarget.name}) and all associated records deleted successfully.`,
      });
      setDeleteTarget(null);
      await fetchFarmers(currentCursor, statusFilter);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to delete farmer account.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      key: 'user_id',
      header: 'ID',
      render: (val) => <span className="font-mono text-xs text-slate-500">#{val}</span>,
    },
    {
      key: 'name',
      header: 'Farmer Name',
      render: (_, row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.name}</span>
          <span className="text-xs text-slate-500">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone / Location',
      render: (_, row) => (
        <div>
          <span className="text-xs text-slate-700 block">{row.phone || 'No phone'}</span>
          <span className="text-xs text-slate-400 truncate max-w-[160px] block">
            {row.address || 'No address'}
          </span>
        </div>
      ),
    },
    {
      key: 'farm_count',
      header: 'Farms',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
          {val || 0} farms
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <Badge variant={val === 'active' ? 'success' : 'danger'}>
          {val === 'active' ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Registered',
      render: (val) => (
        <span className="text-xs text-slate-500">
          {val ? new Date(val).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <Link to={`/admin/users/${row.user_id}`}>
            <Button variant="ghost" size="sm" title="View & Edit Details">
              <Eye className="w-4 h-4 text-slate-600" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusTarget(row)}
            title={row.status === 'active' ? 'Disable Account' : 'Enable Account'}
            className={row.status === 'active' ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
          >
            {row.status === 'active' ? (
              <UserX className="w-4 h-4" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(row)}
            title="Delete Account"
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Toast notifications */}
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Farmer Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage registered farmers, update profile details, and control account active status.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filter and Control Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter Status:</span>
            </span>
            <div className="w-40">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Accounts' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'disabled', label: 'Disabled Only' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Showing {farmers.length} farmers (Page limit: {limit})
            </span>
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      <Card title="Registered Farmer Accounts">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : farmers.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Users className="w-12 h-12 text-slate-300" />}
              title="No farmer accounts found"
              description={
                statusFilter
                  ? `No farmers found matching status "${statusFilter}".`
                  : 'No farmers are currently registered in the system.'
              }
            />
          </div>
        ) : (
          <div>
            <Table columns={columns} data={farmers} keyField="user_id" />

            {/* Keyset Pagination Controls */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPagination}
                disabled={!currentCursor && cursorHistory.length === 0}
                className="flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>First Page</span>
              </Button>

              <div className="text-xs text-slate-500 font-medium">
                {currentCursor ? `Cursor: #${currentCursor}` : 'First Page'}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!nextCursor}
                className="flex items-center gap-1.5"
              >
                <span>Next Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Status Toggle Modal */}
      {statusTarget && (
        <ConfirmDialog
          isOpen={true}
          title={
            statusTarget.status === 'active'
              ? `Disable Account: ${statusTarget.name}`
              : `Enable Account: ${statusTarget.name}`
          }
          message={
            statusTarget.status === 'active'
              ? `Are you sure you want to disable farmer account #${statusTarget.user_id} (${statusTarget.email})? The farmer will be immediately blocked from signing in or accessing any protected endpoints.`
              : `Are you sure you want to enable farmer account #${statusTarget.user_id} (${statusTarget.email})? Login access will be restored immediately.`
          }
          confirmLabel={statusTarget.status === 'active' ? 'Disable Account' : 'Enable Account'}
          confirmVariant={statusTarget.status === 'active' ? 'danger' : 'primary'}
          loading={statusLoading}
          onConfirm={handleStatusConfirm}
          onCancel={() => setStatusTarget(null)}
        />
      )}

      {/* Delete Farmer Modal */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title={`Delete Farmer Account: ${deleteTarget.name}`}
          message={`CAUTION: Are you sure you want to permanently delete farmer account #${deleteTarget.user_id} (${deleteTarget.email})? This action will permanently remove their Firebase user account and cascade-delete all their farms, crops, irrigation schedules, and financial records. This action CANNOT be undone.`}
          confirmLabel="Permanently Delete Farmer"
          confirmVariant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
