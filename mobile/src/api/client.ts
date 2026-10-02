import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { storage } from '../utils/storage';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Bearer JWT token and handle FormData uploads
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ── FormData detection ───────────────────────────────────────────────────
    // If the request body is FormData (file upload), remove the default
    // 'Content-Type: application/json' header so the browser can auto-set
    // 'multipart/form-data; boundary=...' with the correct boundary string.
    // Without this, multer cannot parse the request and req.file is always undefined.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle global error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
