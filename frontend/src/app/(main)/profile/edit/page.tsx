'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Link from 'next/link';
import { toast } from 'react-hot-toast'; // Assuming you use react-hot-toast or similar
import apiClient from '@/lib/apiClient';

// Define a type for the form data
interface ProfileFormData {
  name: string;
  bio: string;
  skills: string; // Comma-separated string for easier input
}

export default function EditProfilePage() {
  const { user, isAuthenticated, isLoading, fetchUser } = useAuth(); // Added fetchUser
  const router = useRouter();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    bio: '',
    skills: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Route protection and pre-fill form
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        skills: user.skills?.join(', ') || '',
      });
    }
  }, [isLoading, isAuthenticated, router, user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s !== '');

    const payload = {
      name: formData.name,
      bio: formData.bio,
      skills: skillsArray,
    };
    
    // Get token from localStorage (adjust if you store it differently)
    const token = localStorage.getItem('accessToken');
    if (!token) {
        setError("Authentication token not found. Please log in again.");
        setIsSubmitting(false);
        // Optionally redirect to login
        // router.push('/login'); 
        return;
    }

    try {
      const response = await apiClient.put(`/api/users/me`, payload);
          //const response = await fetch(`/api/sessions/my`, {
      // Update user in auth context
      await fetchUser(); // This should refetch user and update context

      toast.success('Profile updated successfully!');
      router.push('/profile'); // Navigate back to profile page

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-t-4 border-indigo-600 border-r-4 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-700 font-medium">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          Edit Your Profile
        </h1>
        <p className="text-gray-600">Update your personal information and preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg border border-indigo-100 space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-indigo-700 mb-1">
            Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-indigo-700 mb-1">
            Bio
          </label>
          <textarea
            name="bio"
            id="bio"
            rows={4}
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us a bit about yourself..."
            className="mt-1 block w-full px-3 py-2 bg-white border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-indigo-700 mb-1">
            Skills
          </label>
          <input
            type="text"
            name="skills"
            id="skills"
            value={formData.skills}
            onChange={handleChange}
            placeholder="e.g., Go, Next.js, Guitar, Teaching (comma-separated)"
            className="mt-1 block w-full px-3 py-2 bg-white border border-indigo-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          />
          <p className="mt-1 text-xs text-gray-500">Enter skills separated by commas.</p>
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
            {isSubmitting ? (
              <>
                <div className="inline-block w-4 h-4 border-t-2 border-r-2 border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
