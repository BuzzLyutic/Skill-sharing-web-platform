// src/app/(auth)/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';
import { validateEmail, getEmailError } from '@/lib/validators';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value) {
      setEmailError(getEmailError(value));
    } else {
      setEmailError(null);
    }
  };

  const handleEmailBlur = () => {
    setEmailError(getEmailError(email));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const emailValidationError = getEmailError(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    try {
      await login({ email, password });
      // Перенаправление произойдет внутри login() при успехе
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    }
  };

  const handleGoogleLogin = () => {
      // Просто редиректим на эндпоинт бэкенда
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-0">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          Welcome Back
        </h1>
        <p className="text-gray-600">Sign in to your account to continue</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 py-4 px-6">
          <h2 className="text-xl font-semibold text-white">Login</h2>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-indigo-800">
                Email
              </label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                required
                className={`bg-white border-indigo-200 focus-visible:ring-indigo-500 text-gray-900 ${
                  emailError ? 'border-red-500' : ''
                }`}
                placeholder="your.email@example.com"
              />
              {emailError && (
                <p className="text-xs text-red-600 mt-1">{emailError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-indigo-800">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-800">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white border-indigo-200 focus-visible:ring-indigo-500 text-gray-900"
                placeholder="Enter your password"
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoading || !!emailError} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-t-2 border-white border-r-2 rounded-full animate-spin mr-2"></span>
                  Logging in...
                </>
              ) : 'Login'}
            </Button>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-indigo-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={handleGoogleLogin} 
                variant="outline" 
                className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50 flex items-center justify-center"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Login with Google
              </Button>
            </div>
          </div>
          
          <p className="mt-6 text-center text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}