import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { userError } from './errorCopy';
import { useAppStore } from '@/store/useAppStore';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function errorMessage(error: unknown): string {
  return userError(error, useAppStore.getState().locale);
}
