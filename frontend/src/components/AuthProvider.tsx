// src/components/AuthProvider.tsx
'use client'; // Этот компонент использует useState, useEffect, localStorage

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthContext } from '@/context/AuthContext';
import apiClient from '@/lib/apiClient';
import { User, TokenResponse, LoginRequest, RegisterRequest, AuthContextType } from '@/types';
import { useRouter } from 'next/navigation'; // Используем из next/navigation

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Изначально загрузка
  const router = useRouter();

  const storeTokens = (data: TokenResponse) => {
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    setAccessToken(data.access_token);
  };

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user'); // Очищаем и пользователя
    setAccessToken(null);
    setUser(null);
    delete apiClient.defaults.headers.common['Authorization']; // Удаляем заголовок из дефолтных
  }, []);


  const fetchUser = useCallback(async (token?: string) => {
    const currentToken = token || accessToken || localStorage.getItem('accessToken');
    if (!currentToken) {
        console.log("fetchUser: No token found");
        clearAuthData(); // Убедимся, что все очищено
        setIsLoading(false);
        return;
    }
    console.log("fetchUser: Attempting to fetch user with token:", currentToken);
    try {
      const { data } = await apiClient.get<User>('/api/users/me', {
        headers: { 'Authorization': `Bearer ${currentToken}` } // Явно передаем токен здесь на всякий случай
      });
      console.log("fetchUser: User data received:", data);
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data)); // Сохраняем пользователя в localStorage
    } catch (error: any) {
      console.error('Failed to fetch user:', error.response?.data || error.message);
      // Если ошибка 401 или другая, связанная с авторизацией, очищаем данные
      if (error.response?.status === 401 || error.response?.status === 403) {
        clearAuthData();
        // Не перенаправляем на /login здесь, пусть это решает компонент/страница
        // router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, clearAuthData]);


  // Инициализация при монтировании
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    console.log("AuthProvider Mount: storedToken:", storedToken);
    if (storedToken) {
      setAccessToken(storedToken);
      if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
            setIsLoading(false); // Если есть юзер в сторадже, можно считать не загрузкой
             // Можно добавить проверку актуальности данных через fetchUser() в фоне
             fetchUser(storedToken); // Загрузим свежие данные или проверим токен
          } catch (e) {
              console.error("Failed to parse stored user", e);
              localStorage.removeItem('user');
              fetchUser(storedToken); // Пробуем загрузить с сервера
          }
      } else {
          // Токен есть, юзера нет - загружаем
         fetchUser(storedToken);
      }
    } else {
      setIsLoading(false); // Токена нет, загрузка завершена
    }
  }, [fetchUser]); // fetchUser добавлен в зависимости

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.post<TokenResponse>('/auth/login', credentials);
      storeTokens(data);
      await fetchUser(data.access_token); // Загружаем пользователя после успешного логина
      router.push('/profile'); // Перенаправляем на профиль
    } catch (error: any) {
      console.error('Login failed:', error.response?.data || error.message);
      clearAuthData(); // Очистка в случае ошибки логина
      throw error; // Пробрасываем ошибку для обработки в форме
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (registerData: RegisterRequest) => {
    try {
      setIsLoading(true);
       // Убедимся, что роль не передается!
       const payload = { ...registerData };
       delete (payload as any).role; // Удаляем роль, если она вдруг есть

      const { data } = await apiClient.post<TokenResponse>('/auth/register', payload);
      storeTokens(data);
      await fetchUser(data.access_token); // Загружаем пользователя после успешной регистрации
      router.push('/profile'); // Перенаправляем на профиль
    } catch (error: any) {
      console.error('Registration failed:', error.response?.data || error.message);
      clearAuthData();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true); // Показываем индикатор загрузки во время выхода
    const token = accessToken || localStorage.getItem('accessToken');
    if (token) {
        try {
            // Пытаемся вызвать эндпоинт выхода на бэкенде
            await apiClient.post('/api/logout', {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Logout successful on backend.');
        } catch (error: any) {
            console.error('Failed to logout on backend:', error.response?.data || error.message);
            // Игнорируем ошибку бэкенда и продолжаем выход на клиенте
        }
    }
    clearAuthData();
    router.push('/login'); // Перенаправляем на страницу входа
    setIsLoading(false); // Завершаем загрузку
  };


  // Функция для обработки callback от OAuth
  // Ожидает получить хэш из URL (#access_token=...&refresh_token=...)
  const handleOAuthCallback = useCallback(async (hash: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(hash.substring(1)); // Убираем #
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        const tokenData: TokenResponse = {
          access_token,
          refresh_token,
          expires_in: 0, // expires_in не передается в хэше, можно игнорировать
        };
        storeTokens(tokenData);
        await fetchUser(access_token); // Загружаем данные пользователя
        router.push('/profile'); // Перенаправляем в профиль
      } else {
        throw new Error('Tokens not found in URL hash');
      }
    } catch (error) {
      console.error("OAuth callback handling failed:", error);
      clearAuthData();
      router.push('/login?error=oauth_failed'); // Редирект на логин с ошибкой
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser, router, clearAuthData]); // Добавили зависимости


  const authContextValue: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken && !isLoading, // Более точное определение
    login,
    register,
    logout,
    handleOAuthCallback,
    fetchUser, // Добавляем fetchUser в контекст
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>);
};
