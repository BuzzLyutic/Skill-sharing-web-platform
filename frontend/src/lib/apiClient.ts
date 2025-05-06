// src/lib/apiClient.ts
import axios from 'axios';
import { TokenResponse } from '@/types';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Интерцептор для добавления Access Token к запросам
apiClient.interceptors.request.use(
  (config) => {
    // Не добавляем токен к публичным эндпоинтам
    if (config.url?.startsWith('/auth/')) {
        return config;
    }
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки истекшего Access Token и обновления
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Обрабатываем только 401 ошибки и не для запроса /auth/refresh
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        // Если уже идет обновление, добавляем запрос в очередь
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err); // Пробрасываем ошибку, если обновление не удалось
        });
      }

      originalRequest._retry = true; // Помечаем, что запрос уже пытались повторить
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.error('No refresh token available.');
        // Возможно, стоит вызвать logout здесь
        isRefreshing = false;
        processQueue(new Error('No refresh token'), null);
        // window.location.href = '/login'; // или другой механизм выхода
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<TokenResponse>(`${apiClient.defaults.baseURL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;

        processQueue(null, data.access_token); // Обрабатываем очередь успешным токеном
        return apiClient(originalRequest); // Повторяем оригинальный запрос с новым токеном
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // Возможно, стоит вызвать logout здесь
        processQueue(refreshError, null); // Обрабатываем очередь с ошибкой
        // window.location.href = '/login'; // или другой механизм выхода
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;