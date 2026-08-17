import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Automatically inject JWT Bearer Token into all API calls if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Automatically logout on 401 Unauthorized responses to evict expired tokens
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Loop avoidance: do not trigger redundant logouts if the failing request is /auth/me itself
      const requestUrl = error.config?.url || '';
      if (!requestUrl.includes('/auth/me')) {
        const { logout } = useAuthStore.getState();
        logout();
      }
    }
    return Promise.reject(error);
  }
);

export const fetchDevices = async (params = {}) => {
  const response = await apiClient.get('/devices', { params });
  return response.data;
};

export const registerDevice = async (data) => {
  const response = await apiClient.post('/devices/register', data);
  return response.data;
};

export const updateDeviceLocation = async (deviceId, location) => {
  const response = await apiClient.patch(`/devices/${deviceId}`, { location });
  return response.data;
};

export const fetchDeviceLatest = async (deviceId) => {
  const response = await apiClient.get(`/devices/${deviceId}/latest`);
  return response.data;
};

export const fetchDeviceHistory = async (deviceId, range) => {
  const params = {};
  if (range) params.range = range;
  const response = await apiClient.get(`/devices/${deviceId}/history`, { params });
  return response.data;
};

export const fetchThresholds = async () => {
  const response = await apiClient.get('/thresholds');
  return response.data;
};

export const updateThreshold = async (sensorKey, warningLimit, criticalLimit) => {
  const response = await apiClient.patch(`/thresholds/${sensorKey}`, {
    warningLimit,
    criticalLimit,
  });
  return response.data;
};

export const healthCheck = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const fetchUsers = async () => {
  const response = await apiClient.get('/auth/users');
  return response.data;
};

export const createUser = async ({ username, password, role, tenantId }) => {
  const response = await apiClient.post('/auth/users', { username, password, role, tenantId });
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await apiClient.delete(`/auth/users/${userId}`);
  return response.data;
};

export const fetchViewerDevices = async (userId) => {
  const response = await apiClient.get(`/auth/users/${userId}/devices`);
  return response.data;
};

export const updateViewerDevices = async (userId, deviceIds) => {
  const response = await apiClient.put(`/auth/users/${userId}/devices`, { deviceIds });
  return response.data;
};

// Tenant & Super Admin APIs
export const fetchTenants = async () => {
  const response = await apiClient.get('/tenants');
  return response.data;
};

export const fetchTenant = async (id) => {
  const response = await apiClient.get(`/tenants/${id}`);
  return response.data;
};

export const createTenant = async (data) => {
  const response = await apiClient.post('/tenants', data);
  return response.data;
};

export const updateTenant = async (id, data) => {
  const response = await apiClient.patch(`/tenants/${id}`, data);
  return response.data;
};

export const deleteTenant = async (id) => {
  const response = await apiClient.delete(`/tenants/${id}`);
  return response.data;
};

export const assignDevice = async (tenantId, data) => {
  const response = await apiClient.post(`/tenants/${tenantId}/devices`, data);
  return response.data;
};

export const unassignDevice = async (tenantId, deviceId) => {
  const response = await apiClient.delete(`/tenants/${tenantId}/devices/${deviceId}`);
  return response.data;
};

export const fetchAuditLogs = async (params = {}) => {
  const response = await apiClient.get('/audit-logs', { params });
  return response.data;
};

// Historical Readings API
export const fetchHistoricalReadings = async (params = {}) => {
  const response = await apiClient.get('/api/readings', { params });
  return response.data;
};

export const fetchLatestReading = async (deviceId) => {
  const response = await apiClient.get('/api/readings/latest', { params: { deviceId } });
  return response.data;
};

export const exportReadingsCSV = async (params = {}) => {
  const response = await apiClient.get('/api/readings/export/csv', {
    params,
    responseType: 'blob'
  });
  return response.data;
};
