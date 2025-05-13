// src/app/page.tsx
import Link from 'next/link';
import Button from '@/components/Button';
import RecommendedSessions from '@/components/RecommendedSessions';

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-16">
          <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
            Welcome to the Skill Sharing Platform!
          </h1>
          <p className="mb-10 text-xl text-gray-600 max-w-2xl mx-auto">
            Connect with experts, share your knowledge, and grow your skills in a collaborative community.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link href="/sessions">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                Browse All Sessions
              </Button>
            </Link>
            <Link href="/sessions/create">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-semibold"
              >
                Host a Session
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-indigo-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-indigo-800">Learn New Skills</h3>
            <p className="text-gray-600">
              Discover sessions on a wide range of topics taught by experts in their fields.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-indigo-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-indigo-800">Share Your Knowledge</h3>
            <p className="text-gray-600">
              Host your own sessions and help others learn from your expertise and experience.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-indigo-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-indigo-800">Connect with Others</h3>
            <p className="text-gray-600">
              Build your network and collaborate with like-minded individuals in your field.
            </p>
          </div>
        </div>
        
        {/* Секция с рекомендуемыми сессиями */}
        <RecommendedSessions />
      </div>
    </div>
  );
}