// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css"; // Импорт Tailwind стилей
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar"; // Импортируем Navbar
import AdminNav from '@/components/AdminNav';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Skill Sharing Platform",
  description: "Share your skills and learn new ones!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}>
        <AuthProvider>
          <Navbar />
          <AdminNav />
          <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="bg-indigo-900 text-indigo-100 py-8 mt-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-white">SkillShare</h3>
                  <p className="text-sm">
                    A platform for sharing knowledge and skills with others in your community.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/sessions" className="hover:text-white transition-colors">Browse Sessions</a></li>
                    <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                    <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                  </ul>
                </div>
                <div>
                   <h3 className="text-lg font-semibold mb-4 text-white">Connect</h3>
                  <div className="flex space-x-4">
                    {/* Telegram Link */}
                    <a href="https://t.me/your_telegram_profile" className="text-indigo-200 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                      <span className="sr-only">Telegram</span>
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M21.426 0.074C21.201 -0.012 20.94 -0.003 20.723 0.09L1.353 8.98C1.013 9.134 0.89 9.526 1.043 9.866C1.197 10.206 1.59 10.328 1.93 10.174L6.542 8.027L8.688 12.639C8.865 13.032 9.279 13.265 9.707 13.265C9.783 13.265 9.86 13.257 9.935 13.24L12.255 12.58C12.625 12.474 12.903 12.137 12.936 11.739L13.698 3.383C13.736 2.93 13.397 2.544 12.953 2.505L4.597 1.843C4.199 1.81 3.862 2.088 3.756 2.458L3.1 4.778C3.087 4.853 3.078 4.93 3.078 5.005C3.078 5.434 3.312 5.847 3.704 6.024L7.973 7.973L19.922 2.022L7.973 13.973L14.542 16.58L22.909 2.647C23.017 2.275 22.78 1.923 22.409 1.815L21.426 0.074Z"/>
                        </svg>
                    </a>
                    <a href="https://github.com/BuzzLyutic" className="text-indigo-200 hover:text-white transition-colors">
                      <span className="sr-only">GitHub</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-indigo-800 text-center text-sm">
                <p>&copy; {new Date().getFullYear()} SkillShare. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}