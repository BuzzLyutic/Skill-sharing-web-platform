// src/app/(main)/sessions/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams для чтения query
import apiClient from '@/lib/apiClient';
import { Session } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';
import { format } from 'date-fns'; // Для форматирования даты
import SessionFilters, { SessionFilterParams } from '@/components/SessionFilters'; // Импортируем компонент и тип



// Тип для ответа API с пагинацией
interface PaginatedSessionsResponse {
  data: Session[];
  meta: {
      total_items: number;
      per_page: number;
      current_page: number;
      total_pages: number;
  };
}

export default function SessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [meta, setMeta] = useState<PaginatedSessionsResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth(); // Проверяем, залогинен ли юзер

  // Состояние для фильтров, инициализируется из URL query параметров
  const [activeFilters, setActiveFilters] = useState<SessionFilterParams>(() => {
    const params: SessionFilterParams = { exclude_past: true }; // По умолчанию скрываем прошедшие
    if (searchParams.get('q')) params.q = searchParams.get('q')!;
    if (searchParams.get('category')) params.category = searchParams.get('category')!;
    if (searchParams.get('location')) params.location = searchParams.get('location')!;
    if (searchParams.get('date_from')) params.date_from = searchParams.get('date_from')!;
    if (searchParams.get('date_to')) params.date_to = searchParams.get('date_to')!;
    if (searchParams.get('exclude_past') === 'false') params.exclude_past = false;
    return params;
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  });


  const fetchSessions = useCallback(async (filters: SessionFilterParams, page: number) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.q) queryParams.append('q', filters.q);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.date_from) queryParams.append('date_from', filters.date_from); // Бэкенд ожидает YYYY-MM-DD
      if (filters.date_to) queryParams.append('date_to', filters.date_to);     // Бэкенд ожидает YYYY-MM-DD
      if (filters.exclude_past !== undefined) queryParams.append('exclude_past', filters.exclude_past.toString());


      queryParams.append('page', page.toString());
      queryParams.append('limit', '9'); // Например, 9 сессий на страницу для сетки 3x3

      // Обновляем URL без перезагрузки страницы
      // router.replace(`/sessions?${queryParams.toString()}`, { scroll: false }); // Используем replace

      const response = await apiClient.get<PaginatedSessionsResponse>(`/api/sessions?${queryParams.toString()}`);
      setSessions(response.data.data);
      setMeta(response.data.meta);
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      setError(err.response?.data?.error || 'Could not load sessions.');
      setSessions([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [/* router */]); // router убран, чтобы не было лишних перезагрузок при каждом рендере

  useEffect(() => {
    fetchSessions(activeFilters, currentPage);
  }, [fetchSessions, activeFilters, currentPage]);

  // Обработчик изменения фильтров из SessionFilters.tsx
  const handleFiltersApplied = (newFilters: SessionFilterParams) => {
    const queryParams = new URLSearchParams();
    if (newFilters.q) queryParams.append('q', newFilters.q);
    if (newFilters.category) queryParams.append('category', newFilters.category);
    if (newFilters.location) queryParams.append('location', newFilters.location);
    if (newFilters.date_from) queryParams.append('date_from', newFilters.date_from);
    if (newFilters.date_to) queryParams.append('date_to', newFilters.date_to);
    if (newFilters.exclude_past !== undefined) queryParams.append('exclude_past', newFilters.exclude_past.toString());
    // Применяем фильтры и сбрасываем на первую страницу
    // Обновляем URL
    router.push(`/sessions?${queryParams.toString()}`, { scroll: false });
    setActiveFilters(newFilters);
    setCurrentPage(1);
  };

  // Обработчик изменения страницы
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && (!meta || newPage <= meta.total_pages)) {
      setCurrentPage(newPage);
      // Обновляем URL, чтобы отразить текущую страницу
      const queryParams = new URLSearchParams(searchParams.toString()); // Берем текущие query
      queryParams.set('page', newPage.toString());
      router.push(`/sessions?${queryParams.toString()}`, { scroll: false });
    }
  };


  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Skill Sharing Sessions</h1>
        {isAuthenticated && (
          <Link href="/sessions/create">
            <Button variant="default">Create New Session</Button>
          </Link>
        )}
      </div>

      <SessionFilters
        initialFilters={activeFilters}
        onFilterChange={handleFiltersApplied}
        loading={loading}
      />

      {loading && <div className="text-center py-10">Loading sessions...</div>}
      {error && <div className="text-red-500 text-center py-10">Error: {error}</div>}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-center py-10 text-gray-600">No sessions found matching your criteria.</p>
      )}

      {!loading && !error && sessions.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                    <h2 className="text-xl font-semibold mb-2 text-indigo-700">{session.title}</h2>
                    <p className="text-gray-500 mb-1 text-xs">Category: {session.category}</p>
                    <p className="text-gray-500 mb-1 text-xs">
                        Date: {format(new Date(session.date_time), 'MMM d, yyyy HH:mm')}
                    </p>
                    <p className="text-gray-500 mb-3 text-xs">Location: {session.location}</p>
                    <p className="text-gray-700 text-sm mb-3 line-clamp-3">{session.description}</p> {/* Ограничиваем описание */}
                </div>
                <Link href={`/sessions/${session.id}`} className="mt-auto">
                  <Button variant="outline" size="sm" className="w-full">View Details</Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Пагинация */}
          {meta && meta.total_pages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-2">
              <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || loading} size="sm">
                &laquo; Previous
              </Button>
              {/* Можно добавить генерацию номеров страниц здесь */}
              <span className="text-sm text-gray-700">
                Page {meta.current_page} of {meta.total_pages}
              </span>
              <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= meta.total_pages || loading} size="sm">
                Next &raquo;
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
