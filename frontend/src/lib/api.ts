import axios from 'axios';
import { signOutFromFirebaseClient } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';

const DEFAULT_API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      void signOutFromFirebaseClient();
    }

    return Promise.reject(error);
  },
);

export const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

export default api;
