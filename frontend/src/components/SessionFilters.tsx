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
    <form onSubmit={handleSubmit} className="mb-8 p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 shadow-md border border-indigo-100">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
        <div className="space-y-2">
          <label htmlFor="q" className="block text-sm font-medium text-indigo-800">
            Search (Title/Desc)
          </label>
          <Input
            type="text"
            id="q"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g., Go, Design"
            className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-indigo-800">
            Category
          </label>
          <Input
            type="text"
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Programming"
            className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="block text-sm font-medium text-indigo-800">
            Location
          </label>
          <Input
            type="text"
            id="location"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Online, Room 101"
            className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="date_from" className="block text-sm font-medium text-indigo-800">
            Date From
          </label>
          <Input
            type="date"
            id="date_from"
            name="date_from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-white border-indigo-200 focus-visible:ring-indigo-500 sm:text-sm text-gray-900"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="date_to" className="block text-sm font-medium text-indigo-800">
            Date To
          </label>
          <Input
            type="date"
            id="date_to"
            name="date_to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-white border-indigo-200 focus-visible:ring-indigo-500 sm:text-sm text-gray-900"
          />
        </div>

        <div className="flex items-center pt-4 md:pt-0">
          <input
            type="checkbox"
            id="exclude_past"
            name="exclude_past"
            checked={excludePast}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setExcludePast(e.target.checked)}
            className="h-4 w-4 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="exclude_past" className="ml-2 block text-sm text-indigo-800">
            Hide Past Sessions
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button 
          type="submit" 
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading ? 'Searching...' : 'Apply Filters'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleResetFilters} 
          disabled={loading}
          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
        >
          Reset Filters
        </Button>
      </div>
    </form>
  );
}