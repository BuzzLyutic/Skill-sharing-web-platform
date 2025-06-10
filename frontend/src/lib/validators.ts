// src/lib/validators.ts
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const getEmailError = (email: string): string | null => {
  if (!email) return 'Email is required';
  if (!validateEmail(email)) return 'Please enter a valid email address (e.g., user@example.com)';
  return null;
};

export const getPasswordError = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (!validatePassword(password)) return 'Password must be at least 6 characters';
  return null;
};
