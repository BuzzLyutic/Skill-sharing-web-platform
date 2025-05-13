// src/app/(main)/sessions/[id]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { Session, User, Feedback, FeedbackFormData } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';
import Input from '@/components/Input'; 
import Link from 'next/link';
import { format } from 'date-fns';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string; // Получаем ID из URL
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null); // Ошибки для действий
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackFormData>({ rating: '', comment: '' });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const isCreator = isAuthenticated && session?.creator_id === user?.id;
  const isParticipant = isAuthenticated && participants.some(p => p.id === user?.id);
  const canLeaveFeedback = isAuthenticated && isParticipant && !isCreator; // Добавить условие "сессия прошла"?

  const [isDownloadingICS, setIsDownloadingICS] = useState(false);

  // --- Функция загрузки всех данных ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setActionError(null);
    try {
      // Параллельные запросы для ускорения
      const [sessionRes, participantsRes, feedbackRes] = await Promise.all([
        apiClient.get<Session>(`/api/sessions/${sessionId}`),
        apiClient.get<User[]>(`/api/sessions/${sessionId}/participants`),
        apiClient.get<Feedback[]>(`/api/sessions/${sessionId}/feedback`)
      ]);
      setSession(sessionRes.data);
      setParticipants(participantsRes.data);
      setFeedbackList(feedbackRes.data);
    } catch (err: any) {
      console.error('Failed to fetch session data:', err);
      if (err.response?.status === 404) {
        setError('Session not found.');
      } else {
        setError(err.response?.data?.error || 'Could not load session details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchData();
    }
  }, [sessionId, fetchData]);

  // --- Обработчики действий ---
  const handleJoin = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setIsJoining(true);
    setActionError(null);
    try {
      await apiClient.post(`/api/sessions/${sessionId}/join`);
      await fetchData(); // Обновляем данные после присоединения
    } catch (err: any) {
      console.error('Join error:', err);
      setActionError(err.response?.data?.error || 'Failed to join session.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
     if (!isAuthenticated) { router.push('/login'); return; }
     setIsLeaving(true);
     setActionError(null);
     try {
       await apiClient.post(`/api/sessions/${sessionId}/leave`);
       await fetchData(); // Обновляем данные
     } catch (err: any) {
       console.error('Leave error:', err);
       setActionError(err.response?.data?.error || 'Failed to leave session.');
     } finally {
       setIsLeaving(false);
     }
  };

  const handleDelete = async () => {
     if (!isAuthenticated || (!isCreator && user?.role !== 'admin' && user?.role !== 'moderator')) {
         setActionError('You do not have permission to delete this session.');
         return;
     }
     if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
         return;
     }
     setIsDeleting(true);
     setActionError(null);
     try {
        // Используем общий эндпоинт, бэкенд проверит права
       await apiClient.delete(`/api/sessions/${sessionId}`);
       router.push('/sessions?message=session_deleted');
     } catch (err: any) {
       console.error('Delete error:', err);
       setActionError(err.response?.data?.error || 'Failed to delete session.');
       setIsDeleting(false);
     }
     // При успехе происходит редирект
  };

   const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFeedbackData(prev => ({ ...prev, [name]: value }));
   };

   const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !canLeaveFeedback) return;

        const rating = parseInt(feedbackData.rating as string, 10);
        if (isNaN(rating) || rating < 1 || rating > 5) {
            setActionError('Rating must be between 1 and 5.');
            return;
        }

        setIsSubmittingFeedback(true);
        setActionError(null);
        try {
            const apiData = { rating, comment: feedbackData.comment };
            await apiClient.post(`/api/sessions/${sessionId}/feedback`, apiData);
            setShowFeedbackForm(false); // Скрываем форму
            setFeedbackData({ rating: '', comment: '' }); // Очищаем форму
            await fetchData(); // Обновляем список отзывов
        } catch (err: any) {
            console.error('Feedback submit error:', err);
            setActionError(err.response?.data?.error || 'Failed to submit feedback.');
        } finally {
            setIsSubmittingFeedback(false);
        }
   };


  const handleDownloadICS = async () => {
    if (!session) return;
    setIsDownloadingICS(true);
    setActionError(null);
    try {
        // apiClient добавит заголовок Authorization
        const response = await apiClient.get(`/api/sessions/${session.id}/ics`, {
            responseType: 'blob', // Важно для получения файла как Blob
        });

        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        // Пытаемся получить имя файла из заголовка Content-Disposition
        let filename = `session-${session.title.replace(/\s+/g, '_')}.ics`; // Дефолтное имя
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch.length === 2) {
                filename = filenameMatch[1];
            }
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url); // Очищаем URL объекта

    } catch (err: any) {
        console.error('Failed to download ICS:', err);
        setActionError(err.response?.data?.error || 'Could not download calendar file.');
    } finally {
        setIsDownloadingICS(false);
    }
};


  // --- Рендеринг ---
  if (isLoading || authLoading) return <div>Loading session details...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!session) return <div>Session data could not be loaded.</div>;

  return (
    <div>
      {/* --- Информация о сессии --- */}
      <h1 className="text-3xl font-bold mb-2">{session.title}</h1>
      <p className="text-gray-600 mb-1">Category: {session.category}</p>
      <p className="text-gray-600 mb-1">Date: {format(new Date(session.date_time), 'PPP p')}</p>
      <p className="text-gray-600 mb-4">Location: {session.location}</p>
      <p className="mb-6">{session.description}</p>

      {/* --- Кнопки действий --- */}
      <div className="mb-6 space-x-2">
        {isAuthenticated && !isCreator && !isParticipant && (
          <Button onClick={handleJoin} disabled={isJoining}>
            {isJoining ? 'Joining...' : 'Join Session'}
          </Button>
        )}
        {isAuthenticated && isParticipant && (
          <Button onClick={handleLeave} variant="destructive" disabled={isLeaving}>
            {isLeaving ? 'Leaving...' : 'Leave Session'}
          </Button>
        )}
         {isAuthenticated && isCreator && (
            <Link href={`/sessions/${sessionId}/edit`}>
                <Button variant="outline">Edit Session</Button>
            </Link>
        )}
         {isAuthenticated && (isCreator || user?.role === 'admin' || user?.role === 'moderator') && (
             <Button onClick={handleDelete} variant="destructive" disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete Session'}
             </Button>
        )}
          {isAuthenticated && session && ( // Показывать только для авторизованных и если сессия загружена
            <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={handleDownloadICS}
            disabled={isDownloadingICS}
            >
            {isDownloadingICS ? 'Downloading...' : 'Add to Calendar (.ics)'}
            </Button>
        )}
      </div>
       {actionError && <p className="text-red-500 text-sm mb-4">{actionError}</p>}


      {/* --- Участники --- */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Participants ({participants.length}/{session.max_participants})</h2>
        {participants.length > 0 ? (
          <ul className="list-disc list-inside">
            {participants.map(p => <li key={p.id}>{p.name} ({p.email})</li>)}
          </ul>
        ) : (
          <p>No participants yet.</p>
        )}
      </div>

      {/* --- Отзывы --- */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Feedback</h2>
        {isAuthenticated && canLeaveFeedback && !showFeedbackForm && (
             <Button onClick={() => setShowFeedbackForm(true)} size="sm" variant="outline" className="mb-4">
                 Leave Feedback
             </Button>
        )}

        {/* Форма отзыва */}
        {showFeedbackForm && (
             <form onSubmit={handleFeedbackSubmit} className="mb-6 p-4 border rounded bg-gray-50 space-y-3">
                 <h3 className="text-lg font-medium">Your Feedback</h3>
                  <div>
                    <label htmlFor="rating" className="block text-sm font-medium">Rating (1-5)*</label>
                    <Input type="number" name="rating" id="rating" value={feedbackData.rating} onChange={handleFeedbackChange} min="1" max="5" required />
                  </div>
                   <div>
                    <label htmlFor="comment" className="block text-sm font-medium">Comment</label>
                    <textarea name="comment" id="comment" value={feedbackData.comment} onChange={handleFeedbackChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"/>
                  </div>
                  {actionError && <p className="text-red-500 text-sm">{actionError}</p>}
                  <div className="flex space-x-2">
                     <Button type="submit" disabled={isSubmittingFeedback}>
                        {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                     </Button>
                      <Button type="button" variant="outline" onClick={() => { setShowFeedbackForm(false); setActionError(null); }}>
                        Cancel
                      </Button>
                  </div>
             </form>
        )}


        {/* Список отзывов */}
        {feedbackList.length > 0 ? (
          <div className="space-y-4">
            {feedbackList.map(fb => (
              <div key={fb.id} className="border-b pb-3">
                <p><strong>Rating: {fb.rating}/5</strong></p>
                <p className="text-gray-700 my-1">{fb.comment}</p>
                <p className="text-xs text-gray-500">By User {fb.user_id.substring(0, 8)}... on {format(new Date(fb.created_at), 'PP')}</p>
                 {/* Добавить кнопку удаления отзыва для админа/модератора */}
              </div>
            ))}
          </div>
        ) : (
          <p>No feedback submitted yet.</p>
        )}
      </div>

    </div>
  );
}