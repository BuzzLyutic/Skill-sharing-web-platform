// src/app/(auth)/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
       <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-4">Or login with</p>
             <Button onClick={handleGoogleLogin} variant="outline" className="w-full">
                {/* Можно добавить иконку Google */}
                Login with Google
            </Button>
        </div>
      <p className="mt-6 text-center text-sm">
        Don't have an account?{' '}
        <Link href="/register" className="text-blue-600 hover:underline">Register here</Link>
      </p>
    </div>
  );
}