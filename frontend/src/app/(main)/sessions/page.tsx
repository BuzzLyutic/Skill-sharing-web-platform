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
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          Skill Sharing Sessions
        </h1>
        {isAuthenticated && (
          <Link href="/sessions/create">
            <Button 
              variant="default" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              Create New Session
            </Button>
          </Link>
        )}
      </div>

      <SessionFilters
        initialFilters={activeFilters}
        onFilterChange={handleFiltersApplied}
        loading={loading}
      />

      {loading && (
        <div className="text-center py-16">
          <div className="inline-block w-12 h-12 border-t-4 border-indigo-600 border-r-4 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-700 font-medium">Loading sessions...</p>
        </div>
      )}
      
      {error && (
        <div className="text-center py-10 px-4 bg-red-50 rounded-xl border border-red-200 text-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">Error: {error}</p>
        </div>
      )}
      
      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-16 px-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-indigo-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium text-indigo-700 mb-2">No sessions found</p>
          <p className="text-indigo-600">Try adjusting your filters or create a new session.</p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className="bg-white rounded-xl overflow-hidden border border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
              >
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 py-2 px-4">
                  <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider">
                    {session.category}
                  </p>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold mb-3 text-gray-800 line-clamp-2">{session.title}</h2>
                  <div className="mb-4 space-y-1 text-sm text-gray-600">
                    <p className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {format(new Date(session.date_time), 'MMM d, yyyy HH:mm')}
                    </p>
                    <p className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {session.location}
                    </p>
                  </div>
                  <p className="text-gray-700 text-sm mb-5 line-clamp-3 flex-grow">
                    {session.description}
                  </p>
                  <Link href={`/sessions/${session.id}`} className="mt-auto">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-2 pb-8">
              <Button 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage <= 1 || loading} 
                size="sm"
                variant="outline"
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                &laquo; Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first page, last page, current page, and pages around current
                    return page === 1 || 
                           page === meta.total_pages || 
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                    const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1;
                    
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-700 hover:bg-indigo-50'
                          }`}
                        >
                          {page}
                        </button>
                        {showEllipsisAfter && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                      </React.Fragment>
                    );
                  })}
              </div>
              <Button 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage >= meta.total_pages || loading} 
                size="sm"
                variant="outline"
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              >
                Next &raquo;
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}