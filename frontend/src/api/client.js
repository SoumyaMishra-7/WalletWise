import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000');

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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Something went wrong. Please try again.';

    // ── 401: Try token refresh once, block other requests during refresh, force logout if fail
    if (status === 401 && !originalRequest?._retry && !isSilentRoute(originalRequest?.url)) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await refreshClient.post('/api/auth/refresh', {});
        return api(originalRequest);
      } catch (err) {
        processQueue(err);

        // Advanced 401 handling outside component
        // 1. Silent logout to backend
        refreshClient.post('/auth/logout', {}).catch(() => { });
        // 2. Dispatch for isolated context cleaning if needed
        window.dispatchEvent(new Event('auth:logout'));
        // 3. Purge LocalStorage (if any tokens are stored client-side)
        localStorage.clear();
        sessionStorage.clear();

        // 4. Force redirection outside generic React flow
        if (window.location.pathname !== '/login') {
          toast.error("Session expired. Please log in again.");
          window.location.href = '/login';
        }

        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 400 / 4xx / 500: Show a global toast for non-silent routes ──────────
    if (!isSilentRoute(originalRequest?.url)) {
      if (status >= 400 && status < 500 && status !== 401) {
        toast.error(message);
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
