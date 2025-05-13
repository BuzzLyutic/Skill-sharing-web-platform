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
        return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-t-4 border-indigo-600 border-r-4 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          Create a New Session
        </h1>
        <p className="text-gray-600">Share your knowledge and skills with the community</p>
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
              placeholder="Enter a descriptive title for your session"
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
              placeholder="e.g., Programming, Design, Marketing"
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
              placeholder="Describe what participants will learn and what to expect"
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
                placeholderText="Select date and time"
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
                placeholder="e.g., Online, Room 101, Conference Hall"
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
              placeholder="Enter maximum number of participants"
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
                  Creating...
                </>
              ) : 'Create Session'}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/sessions')} 
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
