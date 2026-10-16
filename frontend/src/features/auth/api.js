import { apiClient } from '../../services/apiClient.js';

// Requirement: Auth.Register
export async function registerApi(payload) {
  const res = await apiClient.post('/auth/register', payload);
  return res.data;
}

// Requirement: Auth.Login
export async function loginApi() {
  const res = await apiClient.post('/auth/login');
  return res.data;
}

// Requirement: Auth.Logout
export async function logoutApi() {
  const res = await apiClient.post('/auth/logout');
  return res.data;
}

// Requirement: Auth.Profile.View
export async function getProfileApi() {
  const res = await apiClient.get('/auth/profile');
  return res.data;
}

// Requirement: Auth.Profile.Update
export async function updateProfileApi(payload) {
  const res = await apiClient.put('/auth/profile', payload);
  return res.data;
}
