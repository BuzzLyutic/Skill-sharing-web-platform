// src/app/(main)/sessions/[id]/edit/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/apiClient';
import { Session, SessionFormData } from '@/types';
import Input from '@/components/Input';
import Button from '@/components/Button';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function EditSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [formData, setFormData] = useState<SessionFormData>({
    title: '', description: '', category: '', date_time: null, location: '', max_participants: '',
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Загрузка данных сессии для предзаполнения
  const fetchSessionData = useCallback(async () => {
     setInitialLoading(true);
     setError(null);
    try {
        const response = await apiClient.get<Session>(`/api/sessions/${sessionId}`);
        const session = response.data;

        // --- Авторизация: Проверяем, является ли текущий пользователь создателем ---
        if (!isAuthenticated || session.creator_id !== user?.id) {
             setError("You don't have permission to edit this session.");
             // Редирект или показ ошибки
             router.replace(`/sessions/${sessionId}?error=forbidden`);
             return;
        }

        setFormData({
            title: session.title,
            description: session.description,
            category: session.category,
            date_time: new Date(session.date_time), // Преобразуем строку в Date
            location: session.location,
            max_participants: session.max_participants.toString(), // Преобразуем число в строку для input
        });
    } catch (err:any) {
        console.error("Failed to fetch session data for edit:", err);
        if (err.response?.status === 404) {
            setError("Session not found.");
        } else if (err.response?.status === 403) {
             setError("You don't have permission to edit this session.");
        }
        else {
            setError("Could not load session data.");
        }
    } finally {
        setInitialLoading(false);
    }
  }, [sessionId, isAuthenticated, user?.id, router]);

  useEffect(() => {
    // Ждем загрузки пользователя перед загрузкой сессии
    if (!authLoading && sessionId) {
        if (!isAuthenticated) {
             router.replace(`/login?redirect=/sessions/${sessionId}/edit`);
        } else {
            fetchSessionData();
        }
    }
  }, [authLoading, sessionId, isAuthenticated, fetchSessionData, router]);


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
    const apiData = {
        ...formData,
        date_time: formData.date_time.toISOString(),
        max_participants: participants,
    };

    try {
      // Используем PUT /api/sessions/:id
      await apiClient.put(`/api/sessions/${sessionId}`, apiData);
      router.push(`/sessions/${sessionId}?message=session_updated`); // Редирект на детали сессии
    } catch (err: any) {
      console.error('Failed to update session:', err);
      setError(err.response?.data?.error || err.response?.data?.details || 'Could not update session.');
      setSubmitting(false);
    }
  };

  if (initialLoading || authLoading) {
    return <div>Loading editor...</div>;
  }
   if (error && !formData.title) { // Показываем ошибку загрузки, если форма еще не заполнена
       return <div className="text-red-500">Error: {error}</div>;
   }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Session</h1>
      {/* Копируем форму со страницы создания, она будет предзаполнена */}
       <form onSubmit={handleSubmit} className="space-y-4">
         {/* ... поля формы (Input, DatePicker, Textarea) как в CreateSessionPage ... */}
          <div><label>Title*</label><Input type="text" name="title" value={formData.title} onChange={handleChange} required /></div>
          <div><label>Category*</label><Input type="text" name="category" value={formData.category} onChange={handleChange} required /></div>
          <div><label>Description</label><textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"/></div>
          <div><label>Date & Time*</label><DatePicker selected={formData.date_time} onChange={handleDateChange} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="MMMM d, yyyy h:mm aa" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholderText="Select date and time" minDate={new Date()} required/> </div>
          <div><label>Location*</label><Input type="text" name="location" value={formData.location} onChange={handleChange} required /></div>
          <div><label>Max Participants*</label><Input type="number" name="max_participants" value={formData.max_participants} onChange={handleChange} min="1" required /></div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Saving Changes...' : 'Save Changes'}
        </Button>
         <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
            Cancel
        </Button>
      </form>
    </div>
  );
}