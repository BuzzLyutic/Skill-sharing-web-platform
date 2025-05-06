// src/app/auth/callback/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams, useRouter } from 'next/navigation'; // Для поиска параметров

export default function AuthCallbackPage() {
  const { handleOAuthCallback, isLoading } = useAuth();
  const router = useRouter();
  // const searchParams = useSearchParams(); // Для параметров строки запроса (?...)

  useEffect(() => {
    // Токены передаются во фрагменте (#...), поэтому window.location.hash
    const hash = window.location.hash;
    if (hash) {
        // Передаем хэш в обработчик AuthProvider
        handleOAuthCallback(hash);
        // AuthProvider сам выполнит редирект после обработки
    } else {
         // Если хэша нет, возможно ошибка или прямой заход
         console.error("OAuth Callback: No hash found in URL");
         router.replace('/login?error=oauth_callback_invalid');
    }
    // Зависимость handleOAuthCallback нужна, чтобы ESLint не ругался,
    // но сама функция обычно стабильна (определена через useCallback).
  }, [handleOAuthCallback, router]);

  // Можно показывать индикатор загрузки, пока AuthProvider обрабатывает
  return <div>Processing login... Please wait.</div>;
}
