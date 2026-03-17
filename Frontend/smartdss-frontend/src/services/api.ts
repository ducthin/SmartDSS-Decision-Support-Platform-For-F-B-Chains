import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

function isPublicOrAuthPath(pathname: string) {
  return (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/swagger-ui') ||
    pathname.startsWith('/v3/api-docs')
  );
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url: string = error.config?.url || '';
      const pathname = url.startsWith('http') ? new URL(url).pathname : url;
      const apiPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

      // Don't log out/redirect for auth/public endpoints or when already on login
      if (!isPublicOrAuthPath(apiPath) && window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
