// src/types/index.ts
import { UUID } from 'crypto'; // Или используйте string, если UUID из Go передается как string

export interface User {
  id: UUID | string; // Используйте string, если UUID приходит как строка
  email: string;
  name: string;
  bio?: string;
  skills: string[];
  average_rating: number;
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  role: 'user' | 'moderator' | 'admin'; // Уточните возможные роли
  oauth_provider?: string;
  oauth_id?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password?: string; // Пароль не нужен для OAuth
}

export interface RegisterRequest {
  email: string;
  password?: string; // Пароль не нужен для OAuth
  name: string;
  bio?: string;
  skills?: string[];
}

// Тип для контекста аутентификации
export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  handleOAuthCallback: (hash: string) => void; // Для обработки хэша после редиректа OAuth
  fetchUser: () => Promise<void>; // Для загрузки данных пользователя
}

// --- Новые типы для Сессий ---
export interface Session {
  id: UUID | string;
  title: string;
  description: string;
  category: string;
  date_time: string; // ISO Date string
  location: string;
  max_participants: number;
  creator_id: UUID | string;
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  // Дополнительные поля, если бэкенд их возвращает (например, текущее кол-во участников)
  // participant_count?: number;
}

// Тип для формы создания/обновления сессии
export interface SessionFormData {
  title: string;
  description: string;
  category: string;
  date_time: Date | null; // Используем Date для DatePicker
  location: string;
  max_participants: number | string; // Может быть строкой в форме
}

// --- Новые типы для Отзывов ---
export interface Feedback {
    id: UUID | string;
    session_id: UUID | string;
    user_id: UUID | string; // ID автора отзыва
    rating: number;
    comment: string;
    created_at: string; // ISO Date string
    // Можно добавить информацию об авторе отзыва, если бэкенд ее отдает
    // authorName?: string;
}

export interface FeedbackFormData {
    rating: number | string; // Может быть строкой в форме
    comment: string;
}