// src/app/(main)/sessions/my-sessions/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button'; // Assuming you have this
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

// Define Session type based on your backend model (or import if shared)
interface Session {
  id: string;
  title: string;
  description: string;
  category: string;
  date_time: string; // ISO string
  location: string;
  max_participants: number;
  creator_id: string;
  // Add other fields like participant_count if your API provides it
}

interface ApiResponse {
    data: Session[];
    meta: {
        total_items: number;
        per_page: number;
        current_page: number;
        total_pages: number;
    };
}

export default function MySessionsPage() {
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add pagination state if needed
  // const [currentPage, setCurrentPage] = useState(1);
  // const [totalPages, setTotalPages] = useState(1);


  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authIsLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) { // Only fetch if authenticated
      const fetchMySessions = async () => {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('accessToken');

        try {
          // Add &page=${currentPage}&limit=10 for pagination
          const response = await apiClient.get(`/api/sessions/my`);
          //const response = await fetch(`/api/sessions/my`, {
          
          const result: ApiResponse = response.data;
          setMySessions(result.data);
          // setTotalPages(result.meta.total_pages);
        } catch (err: any) {
          setError(err.message);
          toast.error(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMySessions();
    } else if (!authIsLoading && !isAuthenticated) {
        setIsLoading(false); // Not authenticated, stop loading
    }
  }, [isAuthenticated, user, authIsLoading]); // Add currentPage to dependency array for pagination

  if (authIsLoading || (isLoading && isAuthenticated)) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-t-4 border-indigo-600 border-r-4 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-700 font-medium">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !authIsLoading) {
    return (
        <div className="text-center py-10">
            <p>Please <Link href="/login" className="text-indigo-600 hover:underline">log in</Link> to see your sessions.</p>
        </div>
    );
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          My Created Sessions
        </h1>
        <Link href="/sessions/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Create New Session
            </Button>
        </Link>
      </div>

      {mySessions.length === 0 && !isLoading ? (
        <div className="text-center py-10 bg-white p-6 rounded-lg shadow border border-indigo-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-indigo-300 mb-4"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path><path d="M22 12A10 10 0 0 0 12 2v10Z"></path></svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Sessions Yet</h3>
          <p className="text-gray-500 mb-4">You haven't created any skill-sharing sessions.</p>
          <Link href="/sessions/create">
              <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Create Your First Session
              </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {mySessions.map((session) => (
            <div key={session.id} className="bg-white p-6 rounded-lg shadow-md border border-indigo-100 hover:shadow-lg transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                <div>
                  <h2 className="text-xl font-semibold text-indigo-700 mb-1">{session.title}</h2>
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-medium">Category:</span> {session.category}
                  </p>
                  <p className="text-sm text-gray-500 mb-1">
                    <span className="font-medium">Date:</span> {new Date(session.date_time).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mb-3">
                    <span className="font-medium">Location:</span> {session.location}
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row items-start sm:items-center">
                    <Link href={`/sessions/${session.id}/edit`}> {/* Assuming an edit page */}
                        <Button variant="outline" size="sm" className="w-full sm:w-auto border-indigo-300 text-indigo-700 hover:bg-indigo-50">Edit</Button>
                    </Link>
                    <Link href={`/sessions/${session.id}`}>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50">View Details</Button>
                    </Link>
                    {/* Add Delete button with confirmation later */}
                </div>
              </div>
              <p className="text-gray-700 mt-2 text-sm leading-relaxed line-clamp-3">{session.description}</p>
            </div>
          ))}
          {/* Add Pagination controls here if implemented */}
        </div>
      )}
    </div>
  );
}