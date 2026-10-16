import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { registerSchema } from '../schemas.js';

export function Register() {
  const navigate = useNavigate();
  const { register: registerAuth } = useAuth();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      await registerAuth(data);
      navigate('/');
    } catch (err) {
      setServerError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl mx-auto shadow-md mb-3">
            🌱
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Farmer Account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Register to manage your farms, weather advisories, and crop schedules
          </p>
        </div>

        <Card>
          {serverError && (
            <div
              role="alert"
              className="p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              placeholder="e.g. Ramesh Kumar"
              required
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                required
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                required
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            <Input
              label="Phone Number"
              placeholder="+919876543210 (Optional)"
              helperText="7-15 digits with optional country code"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Address / Village"
              placeholder="e.g. Village Green, District 4 (Optional)"
              error={errors.address?.message}
              {...register('address')}
            />

            <Button type="submit" variant="primary" loading={submitting} className="w-full mt-2">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
