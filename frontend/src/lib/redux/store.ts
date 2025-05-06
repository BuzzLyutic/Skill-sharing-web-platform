// src/lib/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import exampleReducer from './slices/exampleSlice'; 

export const store = configureStore({
  reducer: {
    example: exampleReducer,

  },
 
  devTools: process.env.NODE_ENV !== 'production', 
});

// Определяем типы для всего хранилища и диспетчера
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

