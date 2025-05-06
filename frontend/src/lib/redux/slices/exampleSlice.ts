// src/lib/redux/slices/exampleSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExampleState {
  value: number;
  status: 'idle' | 'loading' | 'failed';
  message: string | null;
}

const initialState: ExampleState = {
  value: 0,
  status: 'idle',
  message: 'Redux is integrated!', // Простое сообщение для демонстрации
};

export const exampleSlice = createSlice({
  name: 'example', // Имя среза
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    setMessage: (state, action: PayloadAction<string>) => {
        state.message = action.payload;
    }
  },
});

export const { increment, decrement, incrementByAmount, setMessage } = exampleSlice.actions;

export default exampleSlice.reducer;