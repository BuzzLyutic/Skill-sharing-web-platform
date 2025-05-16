'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/Button';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

// Define Session type (can be shared in a types file)
interface Session {
  id: string;
  title: string;
  description: string;
  category: string;
  date_time: string; // ISO string
  location: string;
  max_participants: number;
  creator_id: string;
  // You might want to add creator_name if your API for joined sessions includes it via a JOIN
}

// Define ApiResponse type for paginated data (can be shared)
interface ApiResponse<T> {
  data: T[] | null;
  meta: {
    total_items: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

export default function JoinedSessionsPage() {
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [joinedSessions, setJoinedSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10; // Or make this configurable

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.replace('/login?message=auth_required');
    }
  }, [authIsLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchJoinedSessions = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // Pass pagination parameters to the API
          const response = await apiClient.get<ApiResponse<Session>>('/api/sessions/joined', {
            params: {
              page: currentPage,
              limit: itemsPerPage,
              // exclude_past: true, // Optional: add other filters if your backend supports them for joined sessions
            }
          });
          
          setJoinedSessions(response.data.data || []);
          setTotalPages(response.data.meta.total_pages || 1);
          setTotalItems(response.data.meta.total_items || 0);
        } catch (err: any) {
          const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to fetch joined sessions.';
          setError(errorMessage);
          toast.error(errorMessage);
          setJoinedSessions([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchJoinedSessions();
    } else if (!authIsLoading && !isAuthenticated) {
        setIsLoading(false); 
        setJoinedSessions([]);
    }
  }, [isAuthenticated, user, authIsLoading, currentPage, router]); // Re-fetch when currentPage changes

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (authIsLoading || (isLoading && isAuthenticated)) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-t-4 border-indigo-600 border-r-4 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-700 font-medium">Loading joined sessions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !authIsLoading) {
    return (
        <div className="text-center py-10">
            <p>Please <Link href="/login" className="text-indigo-600 hover:underline">log in</Link> to see sessions you've joined.</p>
        </div>
    );
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-600">
          Sessions You've Joined
        </h1>
        {totalItems > 0 && <p className="text-gray-600">You have joined {totalItems} session(s).</p>}
      </div>

      {joinedSessions.length === 0 && !isLoading ? (
        <div className="text-center py-10 bg-white p-6 rounded-lg shadow border border-gray-200">
           <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mt-4 mb-2">No Joined Sessions Yet</h3>
          <p className="text-gray-500 mb-4">You haven't joined any skill-sharing sessions.</p>
          <Link href="/sessions">
              <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white">
                  Explore Sessions
              </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {joinedSessions.map((session) => (
            <div key={session.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                <div>
                  <h2 className="text-xl font-semibold text-teal-700 mb-1">{session.title}</h2>
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
                <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                    <Link href={`/sessions/${session.id}`}>
                        <Button variant="outline" size="sm" className="border-teal-300 text-teal-700 hover:bg-teal-50">
                            View Details
                        </Button>
                    </Link>
                </div>
              </div>
              <p className="text-gray-700 mt-2 text-sm leading-relaxed line-clamp-3">{session.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center space-x-2">
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            variant="outline"
            className="px-3 py-1 text-sm"
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
            <Button
              key={pageNumber}
              onClick={() => handlePageChange(pageNumber)}
              variant={currentPage === pageNumber ? "default" : "outline"}
              size="sm"
              className={`px-3 py-1 text-sm ${currentPage === pageNumber ? 'bg-teal-600 text-white' : 'text-gray-700'}`}
            >
              {pageNumber}
            </Button>
          ))}
          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            variant="outline"
            className="px-3 py-1 text-sm"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
