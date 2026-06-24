import { createContext } from 'react';

export interface ToastMessage {
  id: number;
  tone: 'accent' | 'neutral';
  message: string;
}

export interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (message: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
