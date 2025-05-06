// src/app/(main)/profile/page.tsx
'use client';

import React, { useEffect } from 'react'; 
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

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
    return <div>Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <div className="space-y-3 bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <div>
          <p className="text-sm font-medium text-gray-500">Name</p>
          <p className="mt-1 text-lg text-gray-900">{user.name}</p>
        </div>
         <div>
          <p className="text-sm font-medium text-gray-500">Email</p>
          <p className="mt-1 text-lg text-gray-900">{user.email}</p>
        </div>
         <div>
          <p className="text-sm font-medium text-gray-500">Role</p>
          <p className="mt-1 text-lg text-gray-900 capitalize">{user.role}</p>
        </div>
        {user.bio && (
            <div>
            <p className="text-sm font-medium text-gray-500">Bio</p>
            <p className="mt-1 text-lg text-gray-900">{user.bio}</p>
            </div>
        )}
         {user.skills && user.skills.length > 0 && (
            <div>
            <p className="text-sm font-medium text-gray-500">Skills</p>
            <div className="mt-1 flex flex-wrap gap-2">
                {user.skills.map((skill, index) => (
                    <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                        {skill}
                    </span>
                ))}
            </div>
            </div>
         )}
          {/* Можно добавить кнопку редактирования профиля, если PUT /api/users/me */}
          {/* <Link href="/profile/edit"> <Button>Edit Profile</Button> </Link> */}
      </div>
    </div>
  );
}