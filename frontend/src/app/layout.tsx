// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css"; // Импорт Tailwind стилей
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar"; // Импортируем Navbar

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
      <body className={inter.className}>
          <AuthProvider> {/* Оборачиваем всё в AuthProvider */}
            <Navbar /> {/* Добавляем Navbar */}
            <main className="container mx-auto px-4 py-8"> {/* Основной контент */}
              {children}
            </main>
          </AuthProvider>
      </body>
    </html>
  );
}
