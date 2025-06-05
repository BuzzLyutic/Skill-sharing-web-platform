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
    return (
      <div className="my-8 text-center">
        <div className="inline-block p-3 rounded-lg bg-indigo-50">
          <div className="w-8 h-8 border-t-2 border-indigo-600 border-r-2 rounded-full animate-spin"></div>
        </div>
        <p className="mt-2 text-indigo-700">Loading recommendations...</p>
      </div>
    );
  }

  if (error || sessions.length === 0) {
    // Можно вернуть null или более мягкое сообщение, если это не основная часть страницы
    // return <div className="my-8 text-center text-gray-500">{error || "No recommendations available right now."}</div>;
    return null; // Если рекомендаций нет или ошибка, просто не показываем блок
  }

  return (
    <div className="my-12 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg">
      <div className="bg-indigo-600 py-4 px-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-indigo-100 flex flex-col"
            >
              <div className="flex-1">
                <div className="text-xs font-medium text-indigo-600 mb-2 uppercase tracking-wider">
                  {session.category}
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-800 line-clamp-2">{session.title}</h3>
                <p className="text-gray-600 mb-3 text-sm">
                  {format(new Date(session.date_time), 'MMM d, yyyy p')}
                </p>
              </div>
              <Link href={`/sessions/${session.id}`}>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  View Details
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}