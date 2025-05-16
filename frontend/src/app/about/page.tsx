// src/app/about/page.tsx
import Link from 'next/link';
import Button from '@/components/Button';

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-extrabold mb-6 pb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600">
            About Skill Sharing Platform
          </h1>
          <p className="mb-10 text-xl text-gray-600 max-w-2xl mx-auto">
            Empowering individuals to share knowledge and grow together in a vibrant learning community.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-indigo-800">Our Mission</h2>
            <p className="text-gray-600 mb-6">
              We believe that everyone has valuable skills to share and knowledge to gain. Our platform 
              connects skilled mentors with eager learners, creating opportunities for growth and 
              collaboration in a supportive environment.
            </p>
            <p className="text-gray-600">
              Whether you're an expert looking to share your knowledge or someone eager to learn new 
              skills, our platform provides the tools and community you need to succeed.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-6 text-indigo-800">How It Works</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-full mr-4 mt-1">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600">Create a profile and showcase your skills or interests</p>
              </div>
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-full mr-4 mt-1">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600">Host sessions to share your expertise or join sessions to learn</p>
              </div>
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-full mr-4 mt-1">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600">Connect with others and build your professional network</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 rounded-xl p-8 mb-16">
          <h2 className="text-3xl font-bold mb-6 text-indigo-800 text-center">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3 text-indigo-800">Skill Sessions</h3>
              <p className="text-gray-600">Create or join interactive learning sessions with experts in various fields.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3 text-indigo-800">Smart Recommendations</h3>
              <p className="text-gray-600">Get personalized session recommendations based on your interests and history.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3 text-indigo-800">Community Feedback</h3>
              <p className="text-gray-600">Rate sessions and leave reviews to help others find the best learning experiences.</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6 text-indigo-800">Ready to Get Started?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/sessions">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                Explore Sessions
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-semibold"
              >
                Join Our Community
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
