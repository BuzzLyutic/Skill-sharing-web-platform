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
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-t-4 border-indigo-600 border-r-4 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-700 font-medium">Loading session data...</p>
        </div>
      </div>
    );
  }

   if (error && !formData.title) { // Показываем ошибку загрузки, если форма еще не заполнена
      return (
      <div className="max-w-2xl mx-auto text-center py-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            onClick={() => router.push('/sessions')} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          Edit Session
        </h1>
        <p className="text-gray-600">Update your session details</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 py-4 px-6">
          <h2 className="text-xl font-semibold text-white">Session Details</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-indigo-800">
              Title*
            </label>
            <Input 
              type="text" 
              name="title" 
              id="title" 
              value={formData.title} 
              onChange={handleChange} 
              required 
              className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-indigo-800">
              Category*
            </label>
            <Input 
              type="text" 
              name="category" 
              id="category" 
              value={formData.category} 
              onChange={handleChange} 
              required 
              className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-indigo-800">
              Description
            </label>
            <textarea 
              name="description" 
              id="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={4} 
              className="w-full rounded-lg border border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="date_time" className="block text-sm font-medium text-indigo-800">
                Date & Time*
              </label>
              <DatePicker
                selected={formData.date_time}
                onChange={handleDateChange}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="w-full rounded-lg border border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm"
                minDate={new Date()}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="location" className="block text-sm font-medium text-indigo-800">
                Location*
              </label>
              <Input 
                type="text" 
                name="location" 
                id="location" 
                value={formData.location} 
                onChange={handleChange} 
                required 
                className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="max_participants" className="block text-sm font-medium text-indigo-800">
              Max Participants*
            </label>
            <Input 
              type="number" 
              name="max_participants" 
              id="max_participants" 
              value={formData.max_participants} 
              onChange={handleChange} 
              min="1" 
              required 
              className="bg-white border-indigo-200 focus-visible:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <Button 
              type="submit" 
              disabled={submitting} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
            >
              {submitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-t-2 border-white border-r-2 rounded-full animate-spin mr-2"></span>
                  Saving Changes...
                </>
              ) : 'Save Changes'}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()} 
              disabled={submitting}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}