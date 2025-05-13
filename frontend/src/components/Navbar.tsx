// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Button from './Button'; // Предполагается, что Button создан
import NotificationsDropdown from './NotificationsDropdown';

const Navbar = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

 return (
    <nav className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-8 w-8 mr-2 text-indigo-300" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
            />
          </svg>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
            SkillShare
          </span>
        </Link>
        
        <div>
          {isLoading ? (
            <div className="flex items-center">
              <div className="w-5 h-5 border-t-2 border-white border-r-2 rounded-full animate-spin mr-2"></div>
              <span className="text-indigo-100">Loading...</span>
            </div>
          ) : isAuthenticated ? (
            <div className="flex items-center space-x-5">
              <span className="hidden sm:inline text-indigo-100">
                Welcome, <span className="font-medium text-white">{user?.name}</span>!
              </span>
              
              <div className="flex items-center space-x-4">
                <Link 
                  href="/sessions" 
                  className="text-indigo-100 hover:text-white transition-colors"
                >
                  Sessions
                </Link>
                <Link 
                  href="/profile" 
                  className="text-indigo-100 hover:text-white transition-colors"
                >
                  Profile
                </Link>
                {isAuthenticated && <NotificationsDropdown />}
                <Button 
                  onClick={logout} 
                  variant="secondary" 
                  size="sm"
                  className="bg-white text-indigo-700 hover:bg-indigo-100"
                >
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-x-4">
              <Link 
                href="/login" 
                className="text-indigo-100 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link href="/register">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-white text-indigo-700 hover:bg-indigo-100"
                >
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;