'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { tripsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { formatDateRange, calculateTripDuration } from '@/lib/utils'
import { TRIP_STATUS_LABELS } from '@junta-tribo/shared'
import type { Trip } from '@junta-tribo/shared'
import { Plus, MapPin, Calendar, Users, LogOut } from 'lucide-react'

export function Dashboard() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    try {
      const response = await tripsApi.getAll()
      setTrips(response.data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch trips',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: 'Success',
        description: 'Logged out successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">JuntaTribo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName}!
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Your Trips</h2>
            <p className="text-gray-600 mt-2">
              Plan and manage your travel adventures
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Trip
          </Button>
        </div>

        {/* Trip Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trips.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trips.filter(trip => new Date(trip.startDate) > new Date()).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trips.filter(trip => trip.status === 'in_progress').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No trips yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start planning your first adventure!
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{trip.title}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {trip.destination}
                      </CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      trip.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      trip.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                      trip.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      trip.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {TRIP_STATUS_LABELS[trip.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {calculateTripDuration(trip.startDate, trip.endDate)} days
                      {trip.participants && trip.participants.length > 0 && 
                        ` • ${trip.participants.length + 1} travelers`
                      }
                    </div>
                    {trip.budget && (
                      <div className="text-sm text-gray-600">
                        Budget: ${trip.budget.toLocaleString()}
                      </div>
                    )}
                  </div>
                  {trip.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                      {trip.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
