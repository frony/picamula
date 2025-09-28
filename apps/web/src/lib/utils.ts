import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { authApi } from './api'
import { LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`
}

export function calculateTripDuration(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Checks if the user's authentication token is still valid
 * @returns Promise<boolean> - true if authenticated, false if expired/invalid
 */
export async function checkAuthStatus(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const token = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
  if (!token) return false

  try {
    await authApi.me()
    return true
  } catch (error: any) {
    // Token is expired/invalid, clear auth data
    if (error.response?.status === 401) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA)
      return false
    }
    // For other errors (network issues, etc), assume auth is still valid
    return true
  }
}
