import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button.jsx';
import { Card } from '../../../components/ui/Card.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { loginSchema } from '../schemas.js';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      const profile = await login(data.email, data.password);
      if (profile.user_type === 'administrator') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setServerError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl mx-auto shadow-md mb-3">
            🌱
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to AgriAssist</h1>
          <p className="text-sm text-slate-500 mt-1">
            Smart Agriculture and Crop Advisory System
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
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Forgot your password?
              </Link>
            </div>

            <Button type="submit" variant="primary" loading={submitting} className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Register as a Farmer
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
