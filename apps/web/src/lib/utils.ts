import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getSession } from 'next-auth/react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string or Date object into a local Date (no timezone shift).
 * Handles ISO strings like '2026-03-15T00:00:00.000Z' by extracting YYYY-MM-DD
 * and constructing a local date, avoiding UTC-to-local day shifts.
 */
function toLocalDate(date: Date | string): Date {
  const str = date instanceof Date ? date.toISOString() : String(date)
  const [year, month, day] = str.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(date: Date | string): string {
  return toLocalDate(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  const start = toLocalDate(startDate)
  const end = toLocalDate(endDate)

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`
  }

  return `${formatDate(start)} - ${formatDate(end)}`
}

export function calculateTripDuration(startDate: Date | string, endDate: Date | string): number {
  const start = toLocalDate(startDate)
  const end = toLocalDate(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Checks if the user's authentication is still valid using NextAuth session
 * @returns Promise<boolean> - true if authenticated, false if expired/invalid
 */
export async function checkAuthStatus(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    const session = await getSession()
    return !!(session?.accessToken)
  } catch (error: any) {
    return false
  }
}
