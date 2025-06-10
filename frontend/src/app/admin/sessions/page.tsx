'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/apiClient';
import { Session } from '@/types';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { format } from 'date-fns';

export default function AdminSessionsPage() {
  const { user: currentUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || currentUser?.role !== 'admin') {
        router.replace('/');
        return;
      }

      const fetchSessions = async () => {
        setLoadingSessions(true);
        setError(null);
        try {
          const response = await apiClient.get<Session[]>('/api/sessions');
          setSessions(response.data);
        } catch (err: any) {
          console.error('Failed to fetch sessions:', err);
          setError(err.response?.data?.error || 'Failed to load sessions.');
        } finally {
          setLoadingSessions(false);
        }
      };
      fetchSessions();
    }
  }, [authLoading, isAuthenticated, currentUser, router]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    setDeletingId(sessionId);
    setError(null);

    try {
      await apiClient.delete(`/api/admin/sessions/${sessionId}`);
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      setError(err.response?.data?.error || `Failed to delete session ${sessionId}.`);
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loadingSessions) {
    return <div>Loading...</div>;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return <div>Access Denied. You must be an administrator to view this page.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Session Management</h1>
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sessions.map((session) => (
              <tr key={session.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{session.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(session.date_time), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.creator_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSession(session.id)}
                    disabled={deletingId === session.id}
                  >
                    {deletingId === session.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}