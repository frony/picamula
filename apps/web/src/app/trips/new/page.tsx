'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { CreateTripForm } from '@/components/trips/create-trip-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, MapPin } from 'lucide-react'

export default function NewTripPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = React.useState(false)

  // Ensure component is mounted on client side
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Handle client-side navigation only
  React.useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router, mounted])

  // Show loading until mounted and auth is resolved
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show loading while redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const handleSuccess = () => {
    router.push('/')
  }

  const handleCancel = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/')}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="hidden md:block w-px h-6 bg-gray-300" />
              <h1 className="text-xl md:text-2xl font-bold text-primary">Pica Mula</h1>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="text-sm text-gray-600 hidden md:inline">
                Welcome, {user?.firstName} {user?.lastName}!
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Create New Trip</h2>
              <p className="text-gray-600 text-sm md:text-base mt-1">
                Plan your next adventure with all the details
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-lg md:text-xl">Trip Details</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Fill out the information below to create your trip. All required fields are marked with an asterisk (*).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <CreateTripForm onSuccess={handleSuccess} onCancel={handleCancel} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
