// src/app/(auth)/register/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';
import { validateEmail, validatePassword, getEmailError, getPasswordError } from '@/lib/validators';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState(''); 
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { register, isLoading } = useAuth();
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value) {
      setPasswordError(getPasswordError(value));
    } else {
      setPasswordError(null);
    }
  };

  const handlePasswordBlur = () => {
    setPasswordError(getPasswordError(password));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const emailValidationError = getEmailError(email);
    const passwordValidationError = getPasswordError(password);
    
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }
    
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s !== '');

    try {
      await register({ name, email, password, bio, skills: skillsArray });
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-indigo-800">
                Password*
              </label>
              <Input 
                type="password" 
                id="password" 
                value={password} 
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                required 
                className={`bg-white border-indigo-200 focus-visible:ring-indigo-500 text-gray-900 ${
                  passwordError ? 'border-red-500' : ''
                }`}
                placeholder="Min. 6 characters"
              />
              {passwordError && (
                <p className="text-xs text-red-600 mt-1">{passwordError}</p>
              )}
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
              className="w-full rounded-lg border border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm text-gray-900"
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
            disabled={isLoading || !!emailError || !!passwordError} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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