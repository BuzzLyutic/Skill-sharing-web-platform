// src/components/AdminNav.tsx
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function AdminNav() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') return null;
  
  return (
    <div className="bg-red-600 text-white p-2 text-center">
      <Link href="/admin/users" className="hover:underline">
        Admin Panel
      </Link>
    </div>
  );
}
