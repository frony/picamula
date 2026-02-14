'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { notesApi, destinationsApi, tripsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, FileText, Calendar, MapPin } from 'lucide-react'
import type { Destination } from '@junta-tribo/shared'

export default function AddNotePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [content, setContent] = React.useState('')
  const [selectedDate, setSelectedDate] = React.useState('')
  const [selectedDestinationId, setSelectedDestinationId] = React.useState<string>('')
  const [destinations, setDestinations] = React.useState<Destination[]>([])
  const [isLoadingDestinations, setIsLoadingDestinations] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Track if we've already checked auth to prevent duplicate redirects
  const hasCheckedAuthRef = React.useRef(false)
  const hasFetchedDestinationsRef = React.useRef(false)

  // Fetch trip data to get the start date
  const fetchTripData = React.useCallback(async () => {
    try {
      const response = await tripsApi.getById(params.id)
      const tripStartDate = String(response.data.startDate).split('T')[0]
      setSelectedDate(tripStartDate)
    } catch (error: any) {
      console.error('Failed to fetch trip:', error)
      // Fallback to today if trip fetch fails
      setSelectedDate(new Date().toISOString().split('T')[0])
    }
  }, [params.id])

  // Fetch destinations for the trip
  const fetchDestinations = React.useCallback(async () => {
    if (hasFetchedDestinationsRef.current) return
    hasFetchedDestinationsRef.current = true

    try {
      setIsLoadingDestinations(true)
      const response = await destinationsApi.getAllBySlug(params.id)
      setDestinations(response.data)
    } catch (error: any) {
      console.error('Failed to fetch destinations:', error)
    } finally {
      setIsLoadingDestinations(false)
    }
  }, [params.id])

  // Handle authentication - only check once
  React.useEffect(() => {
    // Wait for auth to resolve
    if (authLoading) return

    // Only check once
    if (hasCheckedAuthRef.current) return
    hasCheckedAuthRef.current = true

    // Redirect if not authenticated
    if (!user) {
      router.push('/login')
      return
    }

    // Fetch trip data and destinations if authenticated
    fetchTripData()
    fetchDestinations()
  }, [user, authLoading, router, fetchTripData, fetchDestinations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some content for your note',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const noteData: {
        content: string
        date: string
        destinationId?: number
      } = {
        content: content.trim(),
        date: selectedDate + 'T12:00:00.000Z'
      }

      // Only include destinationId if a destination is selected
      if (selectedDestinationId && selectedDestinationId !== 'none') {
        noteData.destinationId = parseInt(selectedDestinationId)
      }

      await notesApi.create(params.id, noteData)

      toast({
        title: 'Success',
        description: 'Note added successfully',
      })

      // Redirect back to trip page
      router.push(`/trips/${params.id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add note',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDestinationChange = (destinationId: string) => {
    setSelectedDestinationId(destinationId)

    // Auto-adjust the date to fit within the destination's date range
    if (destinationId && destinationId !== 'none') {
      const destination = destinations.find(d => String(d.id) === destinationId)
      if (destination?.arrivalDate && destination?.departureDate) {
        const currentDate = selectedDate
        const arrival = destination.arrivalDate.split('T')[0]
        const departure = destination.departureDate.split('T')[0]

        if (currentDate < arrival || currentDate > departure) {
          setSelectedDate(arrival)
        }
      }
    }
  }

  const handleCancel = () => {
    router.push(`/trips/${params.id}`)
  }

  // Show loading while auth is resolving
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null
  }

  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
              <h1 className="text-xl md:text-2xl font-bold text-primary">JuntaTribo</h1>
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Add Trip Note</h2>
              <p className="text-gray-600 text-sm md:text-base mt-1">
                Add a note to keep track of important trip information
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-lg md:text-xl flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Note for {formatDisplayDate(selectedDate)}
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              Choose a date for your note and write down anything important about your trip.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="noteDate" className="text-sm font-medium">
                    Note Date *
                  </Label>
                  <Input
                    id="noteDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Select the date for this note (defaults to today)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination" className="text-sm font-medium flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                    Destination (Optional)
                  </Label>
                  <Select
                    value={selectedDestinationId}
                    onValueChange={handleDestinationChange}
                    disabled={isLoadingDestinations}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingDestinations ? "Loading destinations..." : "Select a destination"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No destination</SelectItem>
                      {destinations.map((destination) => (
                        <SelectItem key={destination.id} value={String(destination.id)}>
                          {destination.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {destinations.length === 0 && !isLoadingDestinations
                      ? 'No destinations added to this trip yet'
                      : 'Optionally associate this note with a specific destination'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium">
                  Note Content *
                </Label>
                <Textarea
                  id="content"
                  placeholder="Write your note here... You can include plans, thoughts, reminders, things you did, things you want to do, places you visited, or any important information about your trip."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px] resize-y"
                  required
                />
                <p className="text-xs text-gray-500">
                  {content.length}/1000 characters
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding Note...
                    </>
                  ) : (
                    'Add Note'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
