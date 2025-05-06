// src/app/page.tsx
import Link from 'next/link';
import Button from '@/components/Button';
import RecommendedSessions from '@/components/RecommendedSessions';

export default function HomePage() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to the Skill Sharing Platform!</h1>
      <p className="mb-8 text-lg text-gray-600">
        Find experts, share your knowledge, and grow together.
      </p>
      <div className="space-x-4 mb-12"> {/* Добавим отступ снизу */}
        <Link href="/sessions">
           <Button size="lg">Browse All Sessions</Button> {/* Сделаем кнопку побольше */}
        </Link>
        {/* Убрал кнопки логина/регистрации отсюда, т.к. они есть в Navbar */}
      </div>
      {/* Секция с рекомендуемыми сессиями */}
      <RecommendedSessions />
    </div>
  );
}
