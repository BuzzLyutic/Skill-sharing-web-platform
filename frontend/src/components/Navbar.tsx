// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Button from './Button'; // Предполагается, что Button создан

const Navbar = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">SkillShare</Link>
        <div>
          {isLoading ? (
            <span>Loading...</span>
          ) : isAuthenticated ? (
            <div className="flex items-center space-x-4">
               <span className="hidden sm:inline">Welcome, {user?.name}!</span>
               <Link href="/profile" className="hover:text-gray-300">Profile</Link>
               <Button onClick={logout} variant="secondary" size="sm">Logout</Button>
            </div>
          ) : (
            <div className="space-x-4">
              <Link href="/login" className="hover:text-gray-300">Login</Link>
              <Link href="/register" className="hover:text-gray-300">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;