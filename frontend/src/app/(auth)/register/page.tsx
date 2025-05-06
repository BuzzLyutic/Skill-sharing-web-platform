// src/app/(auth)/register/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState(''); // Вводим как строку через запятую
  const [error, setError] = useState<string | null>(null);
  const { register, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s !== ''); // Преобразуем строку в массив

    try {
      await register({ name, email, password, bio, skills: skillsArray });
      // Перенаправление произойдет внутри register() при успехе
    } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
        </div>
         <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <Input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1" />
        </div>
         <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <Input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="mt-1" />
        </div>
         <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio (Optional)</label>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
        </div>
         <div>
          <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills (comma-separated, e.g. Go,React,SQL)</label>
          <Input type="text" id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} className="mt-1" />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Registering...' : 'Register'}
        </Button>
      </form>
       <p className="mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">Login here</Link>
      </p>
    </div>
  );
}