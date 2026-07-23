import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('obotantim_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally (excluding background notification polls to avoid redirect loops)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Skip hard redirection if the failing request was the background notification poll
      const isNotificationPoll = error.config?.url?.includes('/admin/notifications');
      
      if (!isNotificationPoll) {
        localStorage.removeItem('obotantim_token');
        localStorage.removeItem('obotantim_user');
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;