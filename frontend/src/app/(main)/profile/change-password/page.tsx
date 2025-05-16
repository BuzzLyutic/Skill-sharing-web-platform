// src/app/(main)/profile/change-password/page.tsx
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

export default function ChangePasswordPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    };

    try {
      await apiClient.put('/api/users/me/password', payload);

      toast.success('Password changed successfully!');
      // Optionally log the user out for security or redirect to profile
      router.push('/profile');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
      // Clear password fields for security
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p>Loading...</p>
      </div>
    );
  }


  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          Change Password
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg border border-indigo-100 space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-indigo-700 mb-1">
            Current Password
          </label>
          <input
            type="password"
            name="currentPassword"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-indigo-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            name="newPassword"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 block w-full px-3 py-2 bg-white border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-indigo-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-indigo-100">
          <Link href="/profile">
            <Button variant="outline" type="button" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="default"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </div>
  );
}