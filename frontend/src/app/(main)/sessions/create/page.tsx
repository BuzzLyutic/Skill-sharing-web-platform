// src/app/(main)/sessions/create/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/apiClient';
import { SessionFormData } from '@/types';
import Input from '@/components/Input';
import Button from '@/components/Button';
import DatePicker from 'react-datepicker'; // Импорт DatePicker
import 'react-datepicker/dist/react-datepicker.css'; // Стили для DatePicker

export default function CreateSessionPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    description: '',
    category: '',
    date_time: null, // Начальное значение null для DatePicker
    location: '',
    max_participants: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Защита маршрута: редирект, если не авторизован
  if (!authLoading && !isAuthenticated) {
    router.replace('/login?message=login_required');
    return null; // Или показать сообщение о необходимости логина
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({ ...prev, date_time: date }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.date_time) {
        setError('Please select a date and time.');
        return;
    }
    const participants = parseInt(formData.max_participants as string, 10);
    if (isNaN(participants) || participants < 1) {
        setError('Maximum participants must be a number greater than 0.');
        return;
    }

    setSubmitting(true);

    // Преобразуем данные для API
    const apiData = {
        ...formData,
        date_time: formData.date_time.toISOString(), // Преобразуем в ISO строку
        max_participants: participants,
    };

    try {
      // Используем POST /api/sessions (требует токена, apiClient добавит его)
      await apiClient.post('/api/sessions', apiData);
      router.push('/sessions?message=session_created'); // Редирект на список сессий
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError(err.response?.data?.error || err.response?.data?.details || 'Could not create session.');
      setSubmitting(false);
    }
     // setSubmitting(false) не нужен здесь, т.к. происходит редирект при успехе
  };

   if (authLoading) {
        return <div>Loading...</div>;
   }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create a New Session</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">Title*</label>
          <Input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required />
        </div>
         <div>
          <label htmlFor="category" className="block text-sm font-medium">Category*</label>
          {/* Лучше использовать Select, если категории предопределены */}
          <Input type="text" name="category" id="category" value={formData.category} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium">Description</label>
          <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"/>
        </div>
        <div>
            <label htmlFor="date_time" className="block text-sm font-medium">Date & Time*</label>
            <DatePicker
                selected={formData.date_time}
                onChange={handleDateChange}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                placeholderText="Select date and time"
                minDate={new Date()} // Запрещаем выбирать прошлые даты
                required
            />
        </div>
         <div>
          <label htmlFor="location" className="block text-sm font-medium">Location*</label>
          <Input type="text" name="location" id="location" value={formData.location} onChange={handleChange} required />
        </div>
         <div>
          <label htmlFor="max_participants" className="block text-sm font-medium">Max Participants*</label>
          <Input type="number" name="max_participants" id="max_participants" value={formData.max_participants} onChange={handleChange} min="1" required />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating...' : 'Create Session'}
        </Button>
      </form>
    </div>
  );
}
