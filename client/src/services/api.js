import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: automatically inject JWT token if stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('storeops_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract response body or format API error
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Intercept 401 Unauthorized for expired or missing sessions
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('storeops_token');
        localStorage.removeItem('storeops_user');
      }
    }

    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      errorCode: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      statusCode: error.response?.status || 500,
      details: error.response?.data?.error?.details || null,
    };

    return Promise.reject(customError);
  }
);

export default api;
