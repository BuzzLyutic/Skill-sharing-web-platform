// src/app/(main)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Если НЕ идет загрузка и пользователь НЕ аутентифицирован
    if (!isLoading && !isAuthenticated) {
      console.log('MainLayout: Not authenticated, redirecting to /login');
      router.replace('/login'); // Используем replace, чтобы нельзя было вернуться назад по истории браузера
    }
  }, [isAuthenticated, isLoading, router]);

  // Пока идет загрузка или если не аутентифицирован (но редирект еще не сработал),
  // можно показать лоадер или пустой фрагмент
  if (isLoading || !isAuthenticated) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>; // Или null, или <></>
  }

  // Если аутентифицирован, показываем дочерние компоненты (страницу)
  return <>{children}</>;
}