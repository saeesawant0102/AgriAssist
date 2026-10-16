import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../app/ProtectedRoute.jsx';
import { ChangePassword } from '../features/auth/pages/ChangePassword.jsx';
import { ForgotPassword } from '../features/auth/pages/ForgotPassword.jsx';
import { Login } from '../features/auth/pages/Login.jsx';
import { Profile } from '../features/auth/pages/Profile.jsx';
import { Register } from '../features/auth/pages/Register.jsx';

// Mock AuthContext
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockResetPassword = vi.fn();
const mockChangePassword = vi.fn();
const mockUpdateProfile = vi.fn();

let mockAuthState = {
  user: null,
  profile: null,
  loading: false,
  error: null,
  login: mockLogin,
  register: mockRegister,
  resetPassword: mockResetPassword,
  changePassword: mockChangePassword,
  updateProfile: mockUpdateProfile,
  logout: vi.fn(),
};

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockAuthState,
}));

describe('Frontend Auth & Profile Component Tests', () => {
  it('Auth.Login.Validation: displays validation errors for missing email and password', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('Auth.Register.Validation: validates password mismatch and min length', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^full name/i), { target: { value: 'Ramesh' } });
    fireEvent.change(screen.getByLabelText(/^email address/i), {
      target: { value: 'ramesh@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/^confirm password/i), {
      target: { value: 'DifferentPassword' },
    });

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('Auth.ForgotPassword.Neutral: displays confirmation message after submission', async () => {
    mockResetPassword.mockResolvedValueOnce(true);

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'ramesh@example.com' },
    });

    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(
        screen.getByText(/if an account exists for that email, we have sent password reset instructions/i)
      ).toBeInTheDocument();
    });
  });

  it('Auth.ProtectedRoute.Redirect: redirects unauthenticated users to /login', () => {
    mockAuthState.user = null;
    mockAuthState.profile = null;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page Mock</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Mock')).toBeInTheDocument();
    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
  });

  it('Auth.Profile.ViewAndUpdate: renders profile data and calls updateProfile', async () => {
    mockAuthState.user = { uid: 'uid123' };
    mockAuthState.profile = {
      user_id: 1,
      farmer_id: 10,
      name: 'Ramesh Patel',
      email: 'ramesh@example.com',
      phone: '+919876543210',
      address: 'Farm House 1',
      user_type: 'farmer',
      status: 'active',
      farm_count: 2,
      created_at: '2026-04-15T10:00:00.000Z',
    };
    mockUpdateProfile.mockResolvedValueOnce({
      ...mockAuthState.profile,
      name: 'Ramesh Kumar Patel',
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    expect(screen.getByText('Ramesh Patel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ramesh Patel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ramesh@example.com')).toBeDisabled(); // email immutable

    fireEvent.change(screen.getByDisplayValue('Ramesh Patel'), {
      target: { value: 'Ramesh Kumar Patel' },
    });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ramesh Kumar Patel',
        })
      );
    });
  });

  it('Auth.ChangePassword.Success: submits current and new passwords with matching confirmation', async () => {
    mockChangePassword.mockResolvedValueOnce();

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'OldPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: 'NewPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'NewPassword123' },
    });

    const submitBtn = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('OldPassword123', 'NewPassword123');
      expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
    });
  });
});
