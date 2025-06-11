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
          const sessionsData = Array.isArray(response.data) ? response.data : [];
          setSessions(sessionsData);
        } catch (err: any) {
          console.error('Failed to fetch sessions:', err);
          setError(err.response?.data?.error || 'Failed to load sessions.');
          setSessions([]); 
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
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-t-2 border-indigo-600 border-r-2 rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Access Denied. You must be an administrator to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Session Management</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Error: {error}</p>
        </div>
      )}
      
      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No sessions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {session.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {session.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {format(new Date(session.date_time), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {session.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingId === session.id}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deletingId === session.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
