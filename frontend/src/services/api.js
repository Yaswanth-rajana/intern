import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

export const fetchDevices = async () => {
  const response = await apiClient.get('/devices');
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

export const healthCheck = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};
