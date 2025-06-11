'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/apiClient';
import { User } from '@/types'; // Убедитесь, что тип User и роли определены
import { useRouter } from 'next/navigation';
import Button from '@/components/Button'; // Ваш компонент кнопки
// import Select from '@/components/Select'; // Возможно, у вас есть компонент Select

// Определим типы ролей для фронтенда
type UserRole = 'user' | 'moderator' | 'admin';
const validRoles: UserRole[] = ['user', 'moderator', 'admin'];

export default function AdminUsersPage() {
  const { user: currentUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null); // ID юзера, чья роль обновляется
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const router = useRouter();

  // 1. Защита маршрута и загрузка пользователей
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || currentUser?.role !== 'admin') {
        // Перенаправляем, если не админ
        router.replace('/'); // Или на страницу логина/ошибки доступа
        return;
      }

      // Загружаем пользователей, если админ
      const fetchUsers = async () => {
        setLoadingUsers(true);
        setError(null);
        try {
          const response = await apiClient.get<User[]>('/api/admin/users');
          setUsers(response.data);
        } catch (err: any) {
          console.error('Failed to fetch users:', err);
          setError(err.response?.data?.error || 'Failed to load users.');
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [authLoading, isAuthenticated, currentUser, router]);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setDeletingUserId(userId);
    setError(null);

    try {
      await apiClient.delete(`/api/admin/users/${userId}`);
      // Удаляем пользователя из локального состояния
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      console.log(`Successfully deleted user ${userId}`);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setError(err.response?.data?.error || `Failed to delete user.`);
    } finally {
      setDeletingUserId(null);
    }
  };

  // 3. Обработчик изменения роли
  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    if (!currentUser || targetUserId === currentUser.id) {
      setError("Cannot change your own role here.");
      return;
    }
    if (!validRoles.includes(newRole)) {
        setError(`Invalid role selected: ${newRole}`);
        return;
    }

    setUpdatingRoleId(targetUserId); // Показываем индикатор загрузки для этой строки
    setError(null);

    try {
      await apiClient.put(`/api/admin/users/${targetUserId}/role`, { role: newRole });
      // Обновляем локальное состояние
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === targetUserId ? { ...u, role: newRole } : u
        )
      );
      // Можно добавить сообщение об успехе (например, с использованием react-toastify)
      console.log(`Successfully updated role for user ${targetUserId} to ${newRole}`);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      setError(err.response?.data?.error || `Failed to update role for user ${targetUserId}.`);
    } finally {
      setUpdatingRoleId(null); // Убираем индикатор загрузки
    }
  };

  // Рендеринг
  if (authLoading || loadingUsers) {
    return <div>Loading...</div>; // Или ваш компонент спиннера
  }

  // Проверка роли (на случай если useEffect еще не отработал редирект)
  if (!currentUser || currentUser.role !== 'admin') {
    return <div>Access Denied. You must be an administrator to view this page.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-900">User Management</h1>
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change Role</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {currentUser.id === user.id ? (
                  <span className="text-gray-400 italic">Cannot change own role</span>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900">
                    <select
                      value={user.role} // Текущее значение
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        handleRoleChange(user.id as string, e.target.value as UserRole)
                      }
                      disabled={updatingRoleId === user.id} // Блокируем во время обновления
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      {validRoles.map(roleOption => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption}
                        </option>
                      ))}
                    </select>
                     {updatingRoleId === user.id && <span className="text-xs text-gray-500">Saving...</span>}
                     
                  </div>
                )}
              </td>
               <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {currentUser.id !== user.id && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeleteUser(user.id as string)}
                    disabled={deletingUserId === user.id}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}