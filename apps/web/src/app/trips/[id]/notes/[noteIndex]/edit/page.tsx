'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { tripsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, FileText, Calendar } from 'lucide-react'
import type { Trip } from '@junta-tribo/shared'

interface EditNotePageProps {
  params: {
    id: string
    noteIndex: string
  }
}

export default function EditNotePage({ params }: EditNotePageProps) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [trip, setTrip] = React.useState<Trip | null>(null)
  const [content, setContent] = React.useState('')
  const [selectedDate, setSelectedDate] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [mounted, setMounted] = React.useState(false)

  const noteIndex = parseInt(params.noteIndex)

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

  // Fetch trip data and populate form
  React.useEffect(() => {
    if (mounted && user && params.id) {
      fetchTripAndNote()
    }
  }, [mounted, user, params.id, noteIndex])

  const fetchTripAndNote = async () => {
    try {
      setLoading(true)
      const response = await tripsApi.getById(params.id)
      const tripData = response.data
      setTrip(tripData)
      
      // Check if user is the owner
      if (tripData.owner.id !== user?.id) {
        toast({
          title: 'Access Denied',
          description: 'You can only edit notes for trips that you own',
          variant: 'destructive',
        })
        router.push(`/trips/${params.id}`)
        return
      }

      // Check if note exists
      if (!tripData.notes || noteIndex >= tripData.notes.length || noteIndex < 0) {
        toast({
          title: 'Note Not Found',
          description: 'The note you are trying to edit does not exist',
          variant: 'destructive',
        })
        router.push(`/trips/${params.id}`)
        return
      }

      // Populate form with existing note data
      const note = tripData.notes[noteIndex]
      setContent(note.content)
      setSelectedDate(new Date(note.date).toISOString().split('T')[0])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch trip details',
        variant: 'destructive',
      })
      router.push(`/trips/${params.id}`)
    } finally {
      setLoading(false)
    }
  }

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
      const noteData = {
        content: content.trim(),
        date: new Date(selectedDate).toISOString()
      }
      
      await tripsApi.updateNote(params.id, noteIndex, noteData)
      
      toast({
        title: 'Success',
        description: 'Note updated successfully',
      })
      
      // Redirect back to trip page
      router.push(`/trips/${params.id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update note',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/trips/${params.id}`)
  }

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
              <h1 className="text-xl md:text-2xl font-bold text-primary">PicaMula</h1>
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Edit Trip Note</h2>
              <p className="text-gray-600 text-sm md:text-base mt-1">
                Update your note for {trip.title}
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
              Update the date and content for your trip note.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="noteDate" className="text-sm font-medium">
                  Note Date *
                </Label>
                <Input
                  id="noteDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full md:w-auto"
                  required
                />
                <p className="text-xs text-gray-500">
                  Select the date for this note
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium">
                  Note Content *
                </Label>
                <Textarea
                  id="content"
                  placeholder="Write your note here... You can include plans, thoughts, reminders, or any important information about your trip."
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
                      Updating Note...
                    </>
                  ) : (
                    'Update Note'
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
