import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as fbUpdatePassword,
} from 'firebase/auth';
import { auth } from '../config/firebase.js';
import {
  getProfileApi,
  loginApi,
  logoutApi,
  registerApi,
  updateProfileApi,
} from '../features/auth/api.js';
import { setTokenProvider } from '../services/apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Wire token provider for apiClient interceptor
  useEffect(() => {
    setTokenProvider(async () => {
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
      const saved = localStorage.getItem('agriassist_local_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.email) {
            return `local-token-${parsed.email}`;
          }
        } catch {
          // ignore
        }
      }
      return null;
    });
  }, []);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const saved = localStorage.getItem('agriassist_local_user');
    let hasLocal = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.email) {
          hasLocal = true;
          setUser({
            uid: parsed.uid || `local-uid-${parsed.email}`,
            email: parsed.email,
            getIdToken: async () => `local-token-${parsed.email}`,
          });
          setProfile(parsed.profile || null);
          setLoading(false);
        }
      } catch {
        // ignore
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          // Fetch or sync server profile via POST /auth/login
          const serverProfile = await loginApi();
          setProfile(serverProfile);
          setError(null);
        } catch (err) {
          console.error('[AuthContext] Failed to load server profile:', err);
          if (err.code === 'ACCOUNT_DISABLED') {
            setError('Your account is disabled. Please contact the administrator.');
            await signOut(auth);
            setUser(null);
            setProfile(null);
          } else {
            setError(err.message || 'Failed to authenticate with server');
            setProfile(null);
          }
        }
      } else if (!hasLocal) {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Requirement: Auth.Login
  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        setUser(cred.user);
        const serverProfile = await loginApi();
        setProfile(serverProfile);
        return serverProfile;
      } catch (fbErr) {
        console.warn('[AuthContext] Client Firebase sign-in skipped/failed:', fbErr.message);
        const fallbackUser = {
          uid: `local-uid-${email}`,
          email,
          getIdToken: async () => `local-token-${email}`,
        };
        setUser(fallbackUser);
        localStorage.setItem(
          'agriassist_local_user',
          JSON.stringify({ uid: fallbackUser.uid, email })
        );
        const serverProfile = await loginApi();
        setProfile(serverProfile);
        localStorage.setItem(
          'agriassist_local_user',
          JSON.stringify({ uid: fallbackUser.uid, email, profile: serverProfile })
        );
        return serverProfile;
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Requirement: Auth.Register
  const register = async (payload) => {
    setError(null);
    setLoading(true);
    try {
      // 1. Create farmer in backend (and Firebase if configured)
      const newProfile = await registerApi({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone || undefined,
        address: payload.address || undefined,
      });

      // 2. Sign in client SDK or fall back to local dev user
      try {
        const cred = await signInWithEmailAndPassword(auth, payload.email, payload.password);
        setUser(cred.user);
      } catch (fbErr) {
        console.warn('[AuthContext] Client Firebase sign-in skipped/failed:', fbErr.message);
        const fallbackUser = {
          uid: newProfile.user_id ? `local-uid-${newProfile.user_id}` : `local-uid-${payload.email}`,
          email: payload.email,
          getIdToken: async () => `local-token-${payload.email}`,
        };
        setUser(fallbackUser);
        localStorage.setItem(
          'agriassist_local_user',
          JSON.stringify({ uid: fallbackUser.uid, email: payload.email, profile: newProfile })
        );
      }
      setProfile(newProfile);
      return newProfile;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Requirement: Auth.Logout
  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('[AuthContext] Server logout notification failed:', err.message);
    } finally {
      localStorage.removeItem('agriassist_local_user');
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
      setUser(null);
      setProfile(null);
      setError(null);
    }
  };

  // Requirement: Forgot Password (Reset)
  const resetPassword = async (email) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      console.error('[AuthContext] Password reset error:', err);
      return true;
    }
  };

  // Requirement: Change Password
  const changePassword = async (currentPassword, newPassword) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('No authenticated user found');
    }

    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await fbUpdatePassword(auth.currentUser, newPassword);
  };

  // Requirement: Auth.Profile.Update
  const updateProfile = async (payload) => {
    const updated = await updateProfileApi(payload);
    setProfile(updated);
    return updated;
  };

  const refreshProfile = async () => {
    const fresh = await getProfileApi();
    setProfile(fresh);
    return fresh;
  };

  const value = {
    user,
    profile,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    changePassword,
    updateProfile,
    refreshProfile,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context || {};
}
