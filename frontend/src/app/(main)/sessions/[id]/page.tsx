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
  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-t-4 border-indigo-600 border-r-4 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-700 font-medium">Loading session details...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 px-4">
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
  if (!session) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 px-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-indigo-700 mb-2">Session Not Found</h2>
          <p className="text-indigo-600 mb-4">The session data could not be loaded.</p>
          <Button 
            onClick={() => router.push('/sessions')} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Browse Sessions
          </Button>
        </div>
      </div>
    );
  }

return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 py-6 px-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-indigo-100 uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
                {session.category}
              </span>
              <h1 className="text-3xl font-bold mt-2 text-white">{session.title}</h1>
            </div>
            {isAuthenticated && session && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadICS}
                disabled={isDownloadingICS}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                {isDownloadingICS ? 'Downloading...' : (
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Calendar
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs text-indigo-600 font-medium">Date & Time</p>
                <p className="text-gray-800">{format(new Date(session.date_time), 'PPP p')}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="text-xs text-indigo-600 font-medium">Location</p>
                <p className="text-gray-800">{session.location}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <div>
                <p className="text-xs text-indigo-600 font-medium">Participants</p>
                <p className="text-gray-800">{participants.length}/{session.max_participants}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-indigo-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-indigo-800 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-line">{session.description}</p>
          </div>
          
          {actionError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {actionError}
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            {isAuthenticated && !isCreator && !isParticipant && (
              <Button 
                onClick={handleJoin} 
                disabled={isJoining}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isJoining ? (
                  <>
                    <span className="inline-block w-4 h-4 border-t-2 border-white border-r-2 rounded-full animate-spin mr-2"></span>
                    Joining...
                  </>
                ) : 'Join Session'}
              </Button>
            )}
            
            {isAuthenticated && isParticipant && (
              <Button 
                onClick={handleLeave} 
                variant="destructive" 
                disabled={isLeaving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isLeaving ? 'Leaving...' : 'Leave Session'}
              </Button>
            )}
            
            {isAuthenticated && isCreator && (
              <Link href={`/sessions/${sessionId}/edit`}>
                <Button 
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  Edit Session
                </Button>
              </Link>
            )}
            
            {isAuthenticated && (isCreator || user?.role === 'admin' || user?.role === 'moderator') && (
              <Button 
                onClick={handleDelete} 
                variant="destructive" 
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Session'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden h-full">
            <div className="bg-indigo-600 py-3 px-4">
              <h2 className="text-lg font-semibold text-white">Participants</h2>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-indigo-700 font-medium">
                  {participants.length} of {session.max_participants} spots filled
                </span>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
                  {Math.round((participants.length / session.max_participants) * 100)}% Full
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, Math.round((participants.length / session.max_participants) * 100))}%` }}
                ></div>
              </div>
              
              {participants.length > 0 ? (
                <ul className="divide-y divide-indigo-100">
                  {participants.map(p => (
                    <li key={p.id} className="py-2 flex items-center">
                      <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-indigo-700">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium">{p.name}</p>
                        <p className="text-gray-500 text-xs">{p.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p>No participants yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden">
            <div className="bg-indigo-600 py-3 px-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Feedback</h2>
              {isAuthenticated && canLeaveFeedback && !showFeedbackForm && (
                <Button 
                  onClick={() => setShowFeedbackForm(true)} 
                  size="sm" 
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  Leave Feedback
                </Button>
              )}
            </div>

            <div className="p-4"> 
              {showFeedbackForm && ( 
                <form onSubmit={handleFeedbackSubmit} className="mb-6 p-4 bg-indigo-50 rounded-lg space-y-4"> 
                <h3 className="text-lg font-medium text-indigo-800 mb-2">Your Feedback</h3> 
                <div className="space-y-2"> 
                  <label htmlFor="rating" className="block text-sm font-medium text-indigo-800"> Rating (1-5)* 
                    </label> 
                    <Input type="number" name="rating" id="rating" value={feedbackData.rating} onChange={handleFeedbackChange} min="1" max="5" required className="bg-white border-indigo-200 focus-visible:ring-indigo-500" /> 
                </div> 
                    <div className="space-y-2"> 
                      <label htmlFor="comment" className="block text-sm font-medium text-indigo-800"> Comment 
                      </label> 
                      <textarea name="comment" id="comment" value={feedbackData.comment} onChange={handleFeedbackChange} rows={3} className="w-full rounded-lg border border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm" placeholder="Share your experience with this session" /> 
                    </div>
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {actionError}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button 
                  type="submit" 
                  disabled={isSubmittingFeedback}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <span className="inline-block w-4 h-4 border-t-2 border-white border-r-2 rounded-full animate-spin mr-2"></span>
                      Submitting...
                    </>
                  ) : 'Submit Feedback'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setShowFeedbackForm(false); setActionError(null); }}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {feedbackList.length > 0 ? (
            <div className="space-y-4">
              {feedbackList.map(fb => (
                <div key={fb.id} className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-indigo-700">
                          {fb.user_id.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">
                          User {fb.user_id.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(fb.created_at), 'PP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center bg-indigo-50 px-2 py-1 rounded-full">
                      <span className="text-indigo-700 font-bold mr-1">{fb.rating}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  </div>
                  {fb.comment && (
                    <p className="text-gray-700 mt-2 text-sm">{fb.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-indigo-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="text-lg font-medium text-indigo-700 mb-1">No Feedback Yet</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Be the first to share your experience with this session.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</div>
); }

