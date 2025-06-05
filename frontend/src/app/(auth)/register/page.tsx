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
    <div className="max-w-md mx-auto py-12 px-4 sm:px-0">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
          Create Your Account
        </h1>
        <p className="text-gray-600">Join our community and start sharing your skills</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 py-4 px-6">
          <h2 className="text-xl font-semibold text-white">Registration Form</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-indigo-800">
              Name*
            </label>
            <Input 
              type="text" 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              className="bg-white border-indigo-200 focus-visible:ring-indigo-500 text-gray-900"
              placeholder="Your full name"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-indigo-800">
              Email*
            </label>
            <Input 
              type="email" 
              id="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="bg-white border-indigo-200 focus-visible:ring-indigo-500 text-gray-900"
              placeholder="your.email@example.com"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-indigo-800">
                Password*
              </label>
              <Input 
                type="password" 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6} 
                className="bg-white border-indigo-200 focus-visible:ring-indigo-500 text-gray-900"
                placeholder="Min. 6 characters"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-indigo-800">
                Confirm Password*
              </label>
              <Input 
                type="password" 
                id="confirmPassword" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                minLength={6} 
                className="bg-white border-indigo-200 focus-visible:ring-indigo-500 text-gray-900"
                placeholder="Repeat password"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="bio" className="block text-sm font-medium text-indigo-800">
              Bio (Optional)
            </label>
            <textarea 
              id="bio" 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              rows={3} 
              className="w-full rounded-lg border border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm"
              placeholder="Tell us a bit about yourself"
            ></textarea>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="skills" className="block text-sm font-medium text-indigo-800">
              Skills (comma-separated)
            </label>
            <Input 
              type="text" 
              id="skills" 
              value={skills} 
              onChange={(e) => setSkills(e.target.value)} 
              className="bg-white border-indigo-200 focus-visible:ring-indigo-500 text-gray-900"
              placeholder="e.g., Go, React, SQL, Design"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-t-2 border-white border-r-2 rounded-full animate-spin mr-2"></span>
                Registering...
              </>
            ) : 'Create Account'}
          </Button>
        </form>
      </div>
      
      <p className="mt-6 text-center text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Log in here
        </Link>
      </p>
    </div>
  );
}