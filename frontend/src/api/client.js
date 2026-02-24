import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

// Routes that should NOT trigger global error toasts (they handle their own errors)
const SILENT_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/me',
  '/auth/logout',
];

const isSilentRoute = (url = '') =>
  SILENT_ROUTES.some((route) => url.includes(route));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Something went wrong. Please try again.';

    // ── 401: Try token refresh once, then force logout ──────────────────────
    if (status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        await refreshClient.post('/auth/refresh', {});
        return api(originalRequest);
      } catch {
        // Refresh also failed — dispatch a global event so AuthContext can
        // clear state and redirect to /login without a circular import.
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }
    }

    // ── 400 / 4xx / 500: Show a global toast for non-silent routes ──────────
    if (!isSilentRoute(originalRequest?.url)) {
      if (status === 400) {
        toast.error(message);
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
