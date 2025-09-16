'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { tripsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatDateRange, calculateTripDuration } from '@/lib/utils'
import { TRIP_STATUS_LABELS } from '@junta-tribo/shared'
import type { Trip } from '@junta-tribo/shared'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign,
  Clock,
  User,
  Edit,
  Share2,
  MoreHorizontal
} from 'lucide-react'

interface TripDetailsPageProps {
  params: {
    id: string
  }
}

export default function TripDetailsPage({ params }: TripDetailsPageProps) {
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch trip details',
        variant: 'destructive',
      })
      // If trip not found or error, redirect back to dashboard
      router.push('/')
    } finally {
      setLoading(false)
    }
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

  const isOwner = trip.owner.id === user.id
  const startDate = new Date(trip.startDate)
  const endDate = new Date(trip.endDate)
  const today = new Date()
  const duration = calculateTripDuration(trip.startDate, trip.endDate)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'planning':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-red-100 text-red-800 border-red-200'
    }
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
              <h1 className="text-xl md:text-2xl font-bold text-primary">JuntaTribo</h1>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="text-sm text-gray-600 hidden md:inline">
                Welcome, {user?.firstName}!
              </span>
              {isOwner && (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Trip Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{trip.title}</h1>
                <Badge variant="secondary" className={`${getStatusColor(trip.status)} border`}>
                  {TRIP_STATUS_LABELS[trip.status]}
                </Badge>
              </div>
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="w-5 h-5 mr-2" />
                <span className="text-lg">{trip.destination}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm">Created by {trip.owner.firstName} {trip.owner.lastName}</span>
              </div>
            </div>
          </div>

          {trip.description && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{trip.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Trip Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Trip Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{formatDateRange(trip.startDate, trip.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Length</p>
                  <p className="font-medium">{duration} days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">
                    {startDate > today ? 'Upcoming' : 
                     endDate < today ? 'Past' : 'Ongoing'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-600" />
                Travelers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Total Travelers</p>
                  <p className="font-medium">
                    {(trip.participants?.length || 0) + 1} people
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Trip Owner</p>
                  <p className="font-medium">{trip.owner.firstName} {trip.owner.lastName}</p>
                </div>
                {trip.participants && trip.participants.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Participants</p>
                    <div className="space-y-1">
                      {trip.participants.map((participant, index) => (
                        <p key={index} className="font-medium text-sm">{participant}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-yellow-600" />
                Budget & Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Budget</p>
                  <p className="font-medium">
                    {trip.budget ? `$${trip.budget.toLocaleString()}` : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium">
                    {new Date(trip.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Itinerary Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Clock className="w-5 h-5 mr-2 text-purple-600" />
              Itinerary
            </CardTitle>
            <CardDescription>
              Trip activities and schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trip.itinerary && trip.itinerary.length > 0 ? (
              <div className="space-y-4">
                {trip.itinerary.map((item, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No itinerary items yet</p>
                <p className="text-sm">Activities and schedule will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
