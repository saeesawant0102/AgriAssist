import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Shield, User } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { updateProfileSchema } from '../schemas.js';

export function Profile() {
  const { profile, updateProfile } = useAuth();
  const [toastMessage, setToastMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile?.name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
    },
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      await updateProfile(data);
      setToastMessage('Profile updated successfully');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      setServerError(err.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50">
          <Toast type="success" message={toastMessage} onClose={() => setToastMessage('')} />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal information and contact details
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-bold border-2 border-emerald-200">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{profile?.name}</h2>
              <p className="text-sm text-slate-500">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  variant={profile?.user_type === 'administrator' ? 'purple' : 'success'}
                  size="sm"
                >
                  {profile?.user_type === 'administrator' ? 'Administrator' : 'Farmer'}
                </Badge>
                <Badge variant={profile?.status === 'active' ? 'success' : 'danger'} size="sm">
                  {profile?.status}
                </Badge>
              </div>
            </div>
          </div>

          <Link to="/profile/change-password">
            <Button variant="outline" size="sm" icon={<KeyRound className="w-4 h-4" />}>
              Change Password
            </Button>
          </Link>
        </div>

        {/* Edit details form */}
        <div className="pt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Edit Profile Information</h3>

          {serverError && (
            <div role="alert" className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              required
              error={errors.name?.message}
              {...register('name')}
            />

            <div>
              <Input
                label="Email Address"
                value={profile?.email || ''}
                disabled
                helperText="Email address cannot be changed (Owner Decision D2)"
                className="bg-slate-50 cursor-not-allowed text-slate-500"
              />
            </div>

            <Input
              label="Phone Number"
              placeholder="+919876543210"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Address / Location"
              placeholder="Village Green, Field 1"
              error={errors.address?.message}
              {...register('address')}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="submit" variant="primary" loading={submitting} disabled={!isDirty}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Account Details / Metadata Card */}
      <Card title="Account Metadata">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-400">Account Type</dt>
            <dd className="mt-1 font-semibold text-slate-800 capitalize">
              {profile?.user_type || 'Farmer'}
            </dd>
          </div>
          {profile?.farmer_id && (
            <div>
              <dt className="text-xs font-medium text-slate-400">Farmer ID</dt>
              <dd className="mt-1 font-semibold text-slate-800">#{profile.farmer_id}</dd>
            </div>
          )}
          {profile?.farm_count !== undefined && (
            <div>
              <dt className="text-xs font-medium text-slate-400">Managed Farms</dt>
              <dd className="mt-1 font-semibold text-slate-800">{profile.farm_count} Farms</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-slate-400">Member Since</dt>
            <dd className="mt-1 text-slate-600">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
