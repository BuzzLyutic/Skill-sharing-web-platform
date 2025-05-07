// src/components/SessionFilters.tsx
'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';
import Input from './Input'; // Ваш компонент Input
import Button from './Button'; // Ваш компонент Button

// Тип для параметров фильтрации, которые этот компонент будет передавать
export interface SessionFilterParams {
  q?: string;
  category?: string;
  location?: string;
  date_from?: string; // ISO string или пустая строка
  date_to?: string;   // ISO string или пустая строка
  exclude_past?: boolean;
  // Добавьте другие фильтры по мере необходимости
}

interface SessionFiltersProps {
  initialFilters?: Partial<SessionFilterParams>; // Начальные значения фильтров
  onFilterChange: (filters: SessionFilterParams) => void; // Callback при изменении фильтров
  loading?: boolean; // Флаг для блокировки кнопки во время загрузки
}

export default function SessionFilters({ initialFilters = {}, onFilterChange, loading }: SessionFiltersProps) {
  const [q, setQ] = useState(initialFilters.q || '');
  const [category, setCategory] = useState(initialFilters.category || '');
  const [location, setLocation] = useState(initialFilters.location || '');
  const [dateFrom, setDateFrom] = useState(initialFilters.date_from || '');
  const [dateTo, setDateTo] = useState(initialFilters.date_to || '');
  const [excludePast, setExcludePast] = useState(initialFilters.exclude_past === undefined ? true : initialFilters.exclude_past);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const filtersToSubmit: SessionFilterParams = {};
    if (q.trim()) filtersToSubmit.q = q.trim();
    if (category.trim()) filtersToSubmit.category = category.trim();
    if (location.trim()) filtersToSubmit.location = location.trim();
    if (dateFrom) filtersToSubmit.date_from = dateFrom;
    if (dateTo) filtersToSubmit.date_to = dateTo;
    filtersToSubmit.exclude_past = excludePast;

    onFilterChange(filtersToSubmit);
  };

  const handleResetFilters = () => {
    setQ('');
    setCategory('');
    setLocation('');
    setDateFrom('');
    setDateTo('');
    setExcludePast(true);
    onFilterChange({ exclude_past: true }); // Сообщаем о сбросе
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        {/* Поиск по тексту */}
        <div>
          <label htmlFor="q" className="block text-sm font-medium text-gray-700">Search (Title/Desc)</label>
          <Input
            type="text"
            id="q"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g., Go, Design"
            className="mt-1"
          />
        </div>

        {/* Категория */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
          <Input
            type="text"
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Programming"
            className="mt-1"
          />
        </div>

        {/* Местоположение */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
          <Input
            type="text"
            id="location"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Online, Room 101"
            className="mt-1"
          />
        </div>

        {/* Дата "С" */}
        <div>
          <label htmlFor="date_from" className="block text-sm font-medium text-gray-700">Date From</label>
          <Input
            type="date" // Используем type="date" для нативного datepicker
            id="date_from"
            name="date_from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Дата "По" */}
        <div>
          <label htmlFor="date_to" className="block text-sm font-medium text-gray-700">Date To</label>
          <Input
            type="date"
            id="date_to"
            name="date_to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Чекбокс "Исключить прошедшие" */}
        <div className="flex items-center pt-4 md:pt-7"> {/* Выравнивание с другими инпутами */}
            <input
                type="checkbox"
                id="exclude_past"
                name="exclude_past"
                checked={excludePast}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setExcludePast(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="exclude_past" className="ml-2 block text-sm text-gray-900">
                Hide Past Sessions
            </label>
        </div>
      </div>

      {/* Кнопки */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Apply Filters'}
        </Button>
        <Button type="button" variant="outline" onClick={handleResetFilters} disabled={loading}>
          Reset Filters
        </Button>
      </div>
    </form>
  );
}
