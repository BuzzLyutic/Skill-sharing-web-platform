'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/users" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
          <h2 className="text-xl font-semibold mb-2">User Management</h2>
          <p className="text-gray-600">Manage users, change roles, delete accounts</p>
        </Link>
        
        <Link href="/admin/sessions" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">Session Management</h2>
            <p className="text-gray-600">View and delete any sessions</p>
        </Link>
      </div>
    </div>
  );
}
