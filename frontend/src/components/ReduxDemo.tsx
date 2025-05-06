// src/components/ReduxDemo.tsx
'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/redux/store'; 
import {
  increment,
  decrement,
  incrementByAmount,
  setMessage,
} from '@/lib/redux/slices/exampleSlice'; 
import Button from './Button'; 

export default function ReduxDemo() {
  const count = useSelector((state: RootState) => state.example.value);
  const message = useSelector((state: RootState) => state.example.message);
  const dispatch = useDispatch<AppDispatch>(); 

  const handleIncrement = () => {
    dispatch(increment()); 
  };

  const handleDecrement = () => {
    dispatch(decrement());
  };

   const handleIncrementBy5 = () => {
    dispatch(incrementByAmount(5));
  };

  const handleSetMessage = () => {
      const newMessage = prompt("Enter new message for Redux state:", message ?? "");
      if (newMessage !== null) {
          dispatch(setMessage(newMessage));
      }
  };

  return (
    <div className="border p-4 rounded my-4 bg-gray-50">
      <h2 className="text-lg font-semibold mb-2">Redux Demo Component</h2>
      <p className="mb-2">Current Count: <span className="font-bold">{count}</span></p>
      <p className="mb-4">Message from Redux: <span className="italic text-blue-600">{message}</span></p>
      <div className="space-x-2">
        <Button size="sm" onClick={handleIncrement}>Increment</Button>
        <Button size="sm" onClick={handleDecrement}>Decrement</Button>
        <Button size="sm" onClick={handleIncrementBy5}>Increment by 5</Button>
        <Button size="sm" variant="outline" onClick={handleSetMessage}>Set Message</Button>
      </div>
    </div>
  );
}