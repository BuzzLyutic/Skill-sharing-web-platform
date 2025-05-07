// src/components/NotificationsDropdown.tsx
'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { Notification } from '@/types'; // Предполагаем, что Notification есть в types
import { useAuth } from '@/hooks/useAuth';
import Button from './Button';
import { formatDistanceToNow } from 'date-fns';


export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get<Notification[]>('/api/notifications/unread?limit=5'); // Берем 5 последних
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Загружаем при монтировании и открытии, если открыто
    if (isAuthenticated && isOpen) {
        fetchNotifications();
    }
    // Можно добавить таймер для периодического обновления
    // const interval = setInterval(() => {
    //     if (isAuthenticated && document.visibilityState === 'visible') {
    //         fetchNotifications();
    //     }
    // }, 60000); // Каждую минуту
    // return () => clearInterval(interval);
  }, [isAuthenticated, isOpen]);


  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.post(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId)); // Удаляем из списка
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
      try {
          await apiClient.post('/api/notifications/read-all');
          setNotifications([]); // Очищаем список
          setIsOpen(false); // Закрываем дропдаун
      } catch (error) {
          console.error("Failed to mark all notifications as read:", error);
      }
  };


  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button onClick={() => {setIsOpen(!isOpen); if(!isOpen) fetchNotifications();}} className="relative p-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && !isOpen && ( // Показываем значок только если закрыто и есть уведомления
          <span className="absolute top-0 right-0 block h-2 w-2 transform -translate-y-1/2 translate-x-1/2 rounded-full ring-2 ring-white bg-red-500"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-20 border text-gray-800">
          <div className="py-2 px-3 border-b flex justify-between items-center">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {notifications.length > 0 && (
                 <Button size="sm" variant="link" onClick={handleMarkAllAsRead} className="text-xs">Mark all as read</Button>
            )}
          </div>
          {isLoading ? (
            <div className="p-4 text-center text-sm">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm">No new notifications.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <div className="p-3">
                    <p className="text-sm mb-1">{n.message}</p>
                    <div className="text-xs text-gray-500 flex justify-between items-center">
                       <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                       <button onClick={() => handleMarkAsRead(n.id as string)} className="text-blue-500 hover:underline text-xs">
                           Mark as read
                       </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
