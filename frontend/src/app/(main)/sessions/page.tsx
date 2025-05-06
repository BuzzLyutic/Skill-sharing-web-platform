// src/app/(main)/sessions/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';
import { Session } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';
import { format } from 'date-fns'; // Для форматирования даты

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth(); // Проверяем, залогинен ли юзер

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        // Сессии может смотреть любой, токен не обязателен для GET /api/sessions
        // apiClient автоматически добавит токен, если он есть
        const response = await apiClient.get<Session[]>('/api/sessions');
        setSessions(response.data);
      } catch (err: any) {
        console.error('Failed to fetch sessions:', err);
        setError(err.response?.data?.error || 'Could not load sessions.');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  if (loading) return <div>Loading sessions...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Skill Sharing Sessions</h1>
        {isAuthenticated && (
          <Link href="/sessions/create">
            <Button>Create New Session</Button>
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <p>No sessions available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-2">{session.title}</h2>
              <p className="text-gray-600 mb-1 text-sm">Category: {session.category}</p>
              <p className="text-gray-600 mb-1 text-sm">
                 Date: {format(new Date(session.date_time), 'PPP p')} {/* Форматируем дату */}
              </p>
              <p className="text-gray-600 mb-3 text-sm">Location: {session.location}</p>
              <p className="text-gray-800 mb-4 text-sm">{session.description.substring(0, 100)}{session.description.length > 100 ? '...' : ''}</p>
              <Link href={`/sessions/${session.id}`}>
                <Button variant="outline" size="sm">View Details</Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
