'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Dashboard } from '@/components/dashboard/dashboard'

export default function Home() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuth()
  const [mounted, setMounted] = React.useState(false)
  const hasRedirectedRef = React.useRef(false)

  // Ensure component is mounted on client side
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect unauthenticated users to login - only once
  React.useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router, mounted])

  // Show loading until mounted and auth is resolved
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show loading while redirecting unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <Dashboard />
}
