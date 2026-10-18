import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Layers,
  Mail,
  MapPin,
  Phone,
  Save,
  Trash2,
  User,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import {
  deleteAdminUserApi,
  getAdminUserByIdApi,
  updateAdminUserApi,
  updateAdminUserStatusApi,
} from '../api.js';

export function FarmerAccountDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Status toggle confirmation
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadFarmer = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminUserByIdApi(userId);
      setFarmer(data);
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load farmer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadFarmer();
    }
  }, [userId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (formData.phone && !/^\+?[0-9]{7,15}$/.test(formData.phone.trim())) {
      errors.phone = 'Phone must be 7-15 digits with optional leading +';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSaving(true);
      const updated = await updateAdminUserApi(userId, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      });
      setFarmer(updated);
      setToastMessage({
        type: 'success',
        text: 'Farmer profile updated successfully.',
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update farmer profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!farmer) return;
    try {
      setStatusLoading(true);
      const newStatus = farmer.status === 'active' ? 'disabled' : 'active';
      const updated = await updateAdminUserStatusApi(userId, newStatus);
      setFarmer(updated);
      setIsStatusModalOpen(false);
      setToastMessage({
        type: 'success',
        text: `Farmer account successfully ${newStatus === 'active' ? 'enabled' : 'disabled'}.`,
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update status.',
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await deleteAdminUserApi(userId);
      setIsDeleteModalOpen(false);
      navigate('/admin/users');
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to delete account.',
      });
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !farmer) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users">
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Farmer Accounts</span>
          </Button>
        </Link>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error || 'Farmer account not found'}
        </div>
      </div>
    );
  }

  const isActive = farmer.status === 'active';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Back button and page title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/admin/users" className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Farmer Accounts</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {farmer.name}
            </h1>
            <Badge variant={isActive ? 'success' : 'danger'}>
              {isActive ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <span className="text-xs text-slate-500 mt-1 block font-mono">
            Farmer #{farmer.farmer_id} &bull; User ID: #{farmer.user_id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsStatusModalOpen(true)}
            className={`flex items-center gap-2 ${
              isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            <span>{isActive ? 'Disable Account' : 'Enable Account'}</span>
          </Button>

          <Button
            variant="danger"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Account Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Mail className="w-4 h-4" />
            <span>Email (Read-Only)</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800 truncate">{farmer.email}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Registered Farms</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800">{farmer.farm_count || 0} farms</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Registration Date</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </Card>
      </div>

      {/* Edit Profile Form */}
      <Card title="Update Farmer Profile">
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          <p className="text-xs text-slate-500 leading-relaxed -mt-2 mb-4">
            Administrators can update farmer personal information (name, phone, address). The email address is immutable and managed through authentication.
          </p>

          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={formErrors.name}
              placeholder="e.g. Ramesh Kumar"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              error={formErrors.phone}
              placeholder="e.g. +919876543210"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Residential / Farm Address
            </label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              error={formErrors.address}
              placeholder="e.g. Village Khed, Pune, Maharashtra"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Status Toggle Modal */}
      <ConfirmDialog
        isOpen={isStatusModalOpen}
        title={isActive ? `Disable Account: ${farmer.name}` : `Enable Account: ${farmer.name}`}
        message={
          isActive
            ? `Are you sure you want to disable farmer account #${farmer.user_id} (${farmer.email})? The farmer will be immediately blocked from signing in.`
            : `Are you sure you want to enable farmer account #${farmer.user_id} (${farmer.email})? Login access will be restored immediately.`
        }
        confirmLabel={isActive ? 'Disable Account' : 'Enable Account'}
        confirmVariant={isActive ? 'danger' : 'primary'}
        loading={statusLoading}
        onConfirm={handleStatusToggle}
        onCancel={() => setIsStatusModalOpen(false)}
      />

      {/* Delete Farmer Modal */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title={`Permanently Delete Farmer: ${farmer.name}`}
        message={`WARNING: You are about to permanently delete farmer account #${farmer.user_id} (${farmer.email}). All farms, crops, advisories, schedules, and financial records belonging to this farmer will be irrevocably deleted via database cascade. Are you sure you wish to continue?`}
        confirmLabel="Permanently Delete Farmer"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
