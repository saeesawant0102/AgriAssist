import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { changePasswordSchema } from '../schemas.js';

export function ChangePassword() {
  const navigate = useNavigate();
  const { changePassword } = useAuth();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setSuccess(true);
      reset();
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setServerError('Current password is incorrect.');
      } else {
        setServerError(err.message || 'Failed to change password');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link
          to="/profile"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Change Password</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Update your account password securely
          </p>
        </div>
      </div>

      <Card>
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Password Changed Successfully</h3>
            <p className="text-sm text-slate-600">
              Your password has been updated. You can continue using your account with the new password.
            </p>
            <div className="pt-2">
              <Button variant="primary" onClick={() => navigate('/profile')}>
                Back to Profile
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <div role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {serverError}
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              required
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              required
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              required
              error={errors.confirmNewPassword?.message}
              {...register('confirmNewPassword')}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => navigate('/profile')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Update Password
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
