// src/components/RecommendedSessions.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';
import { Session } from '@/types'; 
import Button from './Button'; 
import { format } from 'date-fns';

interface RecommendedSessionsProps {
  title?: string; // Необязательный заголовок для секции
}

export default function RecommendedSessions({ title = "Recommended For You" }: RecommendedSessionsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendedSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        // apiClient автоматически добавит токен авторизации, если он есть
        const response = await apiClient.get<Session[]>('/api/sessions/recommended');
        setSessions(response.data);
      } catch (err: any) {
        console.error('Failed to fetch recommended sessions:', err);
        // Не показываем ошибку пользователю слишком навязчиво, т.к. это доп. фича
        // setError(err.response?.data?.error || 'Could not load recommendations.');
        setSessions([]); // Показываем пустой список в случае ошибки
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendedSessions();
  }, []); // Пустой массив зависимостей - загрузка один раз при монтировании

  // Не рендерим ничего, если загрузка или ошибка, или нет сессий (чтобы не загромождать UI)
  if (loading) {
    return <div className="my-8 text-center text-gray-500">Loading recommendations...</div>;
  }

  if (error || sessions.length === 0) {
    // Можно вернуть null или более мягкое сообщение, если это не основная часть страницы
    // return <div className="my-8 text-center text-gray-500">{error || "No recommendations available right now."}</div>;
    return null; // Если рекомендаций нет или ошибка, просто не показываем блок
  }

  return (
    <div className="my-8 p-6 bg-gray-100 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <div key={session.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold mb-1 text-indigo-700">{session.title}</h3>
            <p className="text-gray-500 mb-1 text-xs">Category: {session.category}</p>
            <p className="text-gray-500 mb-2 text-xs">
              Date: {format(new Date(session.date_time), 'MMM d, yyyy p')}
            </p>
            {/* <p className="text-gray-700 text-sm mb-3">{session.description.substring(0, 70)}{session.description.length > 70 ? '...' : ''}</p> */}
            <Link href={`/sessions/${session.id}`}>
              <Button variant="link" size="sm" className="text-indigo-600 hover:text-indigo-800 p-0">
                View Details &rarr;
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
