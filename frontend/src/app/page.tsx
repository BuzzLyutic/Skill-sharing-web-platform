// src/app/page.tsx
import Link from 'next/link';
import Button from '@/components/Button';
import ReduxDemo from "@/components/ReduxDemo"; 

export default function HomePage() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to the Skill Sharing Platform!</h1>
      <p className="mb-8 text-lg text-gray-600">
        Find experts, share your knowledge, and grow together.
      </p>
      <div className="space-x-4">
        <Link href="/login">
           <Button>Login</Button>
        </Link>
         <Link href="/register">
           <Button variant="secondary">Register</Button>
        </Link>
      </div>
      {<ReduxDemo />}
    </div>
  );
}
