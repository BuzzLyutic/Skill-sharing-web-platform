// src/app/(main)/profile/page.tsx
'use client';

import React, { useEffect } from 'react'; 
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Защита маршрута
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);


  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-t-4 border-indigo-600 border-r-4 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-700 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          Your Profile
        </h1>
        <p className="text-gray-600">Manage your personal information and preferences</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 py-6 px-6 flex items-center">
          <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mr-4">
            <span className="text-2xl font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-indigo-100">{user.email}</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-indigo-600 uppercase tracking-wider">
                Account Information
              </h3>
              <div className="bg-indigo-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-indigo-800">Name</p>
                  <p className="mt-1 text-gray-800">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-800">Email</p>
                  <p className="mt-1 text-gray-800">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-800">Role</p>
                  <p className="mt-1 capitalize bg-indigo-100 text-indigo-800 inline-block px-2 py-1 rounded-full text-xs font-medium">
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-indigo-600 uppercase tracking-wider">
                Profile Details
              </h3>
              <div className="bg-indigo-50 rounded-lg p-4 h-full">
                {user.bio ? (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-indigo-800">Bio</p>
                    <p className="mt-1 text-gray-800">{user.bio}</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-indigo-800">Bio</p>
                    <p className="mt-1 text-gray-500 italic">No bio provided</p>
                  </div>
                )}
                
                {user.skills && user.skills.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-indigo-800">Skills</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {user.skills.map((skill, index) => (
                        <span 
                          key={index} 
                          className="px-3 py-1 bg-indigo-200 text-indigo-800 text-xs font-medium rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-indigo-800">Skills</p>
                    <p className="mt-1 text-gray-500 italic">No skills listed</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-indigo-100">
            <h3 className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-4">
              Account Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/profile/edit">
                <Button 
                  variant="default" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Edit Profile
                </Button>
              </Link>
              <Link href="/sessions/my-sessions">
                <Button 
                  variant="outline" 
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  My Sessions
                </Button>
              </Link>
              <Link href="/sessions/joined">
                <Button 
                  variant="outline" 
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  Joined Sessions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}