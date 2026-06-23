import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — inject auth token
api.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    if (tokens.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        const { data } = await axios.post('/api/auth/refresh', {
          refreshToken: tokens.refreshToken,
        });

        const newTokens = {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        };

        localStorage.setItem('tokens', JSON.stringify(newTokens));
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
