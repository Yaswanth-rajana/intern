import axios from 'axios';

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

export const fetchDevices = async () => {
  const response = await apiClient.get('/devices');
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

export const fetchDeviceHistory = async (deviceId) => {
  const response = await apiClient.get(`/devices/${deviceId}/history`);
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
