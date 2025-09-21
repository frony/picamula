'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { tripsApi } from '@/lib/api'
import { EditTripForm } from '@/components/trips/edit-trip-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { Trip } from '@junta-tribo/shared'
import { ArrowLeft, Edit } from 'lucide-react'

interface EditTripPageProps {
  params: {
    id: string
  }
}

export default function EditTripPage({ params }: EditTripPageProps) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [trip, setTrip] = React.useState<Trip | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [mounted, setMounted] = React.useState(false)

  // Ensure component is mounted on client side
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Handle client-side navigation only
  React.useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router, mounted])

  // Fetch trip data
  React.useEffect(() => {
    if (mounted && user && params.id) {
      fetchTrip()
    }
  }, [mounted, user, params.id])

  const fetchTrip = async () => {
    try {
      setLoading(true)
      const response = await tripsApi.getById(params.id)
      setTrip(response.data)
      
      // Check if user is the owner
      if (response.data.owner.id !== user?.id) {
        toast({
          title: 'Access Denied',
          description: 'You can only edit trips that you own',
          variant: 'destructive',
        })
        router.push(`/trips/${params.id}`)
        return
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch trip details',
        variant: 'destructive',
      })
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    router.push(`/trips/${params.id}`)
  }

  const handleCancel = () => {
    router.push(`/trips/${params.id}`)
  }

  // Show loading until mounted and auth is resolved
  if (!mounted || authLoading || loading) {
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

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center py-8">
          <CardContent>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Trip not found
            </h3>
            <p className="text-gray-600 mb-4">
              The trip you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push('/')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
                onClick={() => router.push(`/trips/${params.id}`)}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Trip
              </Button>
              <div className="hidden md:block w-px h-6 bg-gray-300" />
              <h1 className="text-xl md:text-2xl font-bold text-primary">Pica Mula</h1>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="text-sm text-gray-600 hidden md:inline">
                Welcome, {user?.name}!
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
              <Edit className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Edit Trip</h2>
              <p className="text-gray-600 text-sm md:text-base mt-1">
                Update your trip details: {trip.title}
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-lg md:text-xl">Trip Details</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Update the information below to modify your trip. All required fields are marked with an asterisk (*).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <EditTripForm trip={trip} onSuccess={handleSuccess} onCancel={handleCancel} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
