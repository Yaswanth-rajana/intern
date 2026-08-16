import { create } from 'zustand';
import axios from 'axios';
import { useDashboardStore } from './dashboardStore';

const API_URL = import.meta.env.VITE_API_URL;

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: false, // Default to false until checkAuth confirms it
  isCheckingAuth: true,  // Default to true to verify session on startup
  error: null,
  isLoading: false,

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, isCheckingAuth: false });
      return false;
    }

    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { user } = response.data;
      set({ token, user, isAuthenticated: true, isCheckingAuth: false });
      return true;
    } catch (err) {
      console.error('Session verification failed on mount:', err.message);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null, isAuthenticated: false, isCheckingAuth: false });
      return false;
    }
  },

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ token, user, isAuthenticated: true, isLoading: false, isCheckingAuth: false });
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Login failed';
      set({ error: errMsg, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false, error: null });
    // Reset dashboardStore initialized flags to allow fresh load upon re-login
    useDashboardStore.setState({ isInitialized: false, _initializing: false });
  },

  clearError: () => set({ error: null })
}));
