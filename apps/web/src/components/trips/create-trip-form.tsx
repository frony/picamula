'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { tripsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { PlaceAutocomplete, PlaceResult } from '@/components/ui/place-autocomplete'
import { TripStatus } from '@junta-tribo/shared'
import type { CreateTripDto, CreateDestinationDto } from '@junta-tribo/shared'
import { X, Plus, MapPin } from 'lucide-react'

const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  destination: z.string().min(1, 'Destination is required').max(100, 'Destination must be less than 100 characters'),
  startCity: z.string().min(1, 'Start city is required').max(100, 'Start city must be less than 100 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budget: z.string().optional(),
  participants: z.array(z.string()).optional(),
}).refine((data) => {
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)
  return endDate >= startDate
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
}).refine((data) => {
  if (!data.participants) return true
  return data.participants.every(email => {
    if (email.trim() === '') return true
    return z.string().email().safeParse(email).success
  })
}, {
  message: "Please enter valid email addresses",
  path: ["participants"],
})

type CreateTripFormData = z.infer<typeof createTripSchema>

interface CreateTripFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreateTripForm({ onSuccess, onCancel }: CreateTripFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [participants, setParticipants] = useState<string[]>([])
  const [destinations, setDestinations] = useState<CreateDestinationDto[]>([])
  const [startCityValue, setStartCityValue] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateTripFormData>({
    resolver: zodResolver(createTripSchema),
  })

  const handleStartCityChange = (value: string) => {
    setStartCityValue(value)
    setValue('startCity', value)
  }

  const handleStartCitySelect = (place: PlaceResult) => {
    setStartCityValue(place.formattedAddress)
    setValue('startCity', place.formattedAddress)
  }

  const addParticipant = () => {
    setParticipants([...participants, ''])
  }

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const updateParticipant = (index: number, value: string) => {
    const updated = [...participants]
    updated[index] = value
    setParticipants(updated)
  }

  const addDestination = () => {
    setDestinations([...destinations, { name: '' }])
  }

  const removeDestination = (index: number) => {
    setDestinations(destinations.filter((_, i) => i !== index))
  }

  const updateDestination = (index: number, field: keyof CreateDestinationDto, value: string | number | undefined) => {
    const updated = [...destinations]
    if (field === 'arrivalDate' || field === 'departureDate') {
      updated[index] = { ...updated[index], [field]: value ? new Date(value as string) : undefined }
    } else if (field === 'latitude' || field === 'longitude') {
      updated[index] = { ...updated[index], [field]: value as number }
    } else {
      updated[index] = { ...updated[index], [field]: value as string }
    }
    setDestinations(updated)
  }

  const handleDestinationPlaceSelect = (index: number, place: PlaceResult) => {
    const updated = [...destinations]
    updated[index] = {
      ...updated[index],
      name: place.formattedAddress,
      latitude: place.lat,
      longitude: place.lng,
    }
    setDestinations(updated)
  }

  const onSubmit = async (data: CreateTripFormData) => {
    setIsSubmitting(true)
    
    try {
      const tripData: CreateTripDto = {
        title: data.title,
        description: data.description || undefined,
        destination: data.destination,
        startCity: data.startCity,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        budget: data.budget ? parseFloat(data.budget) : undefined,
        status: TripStatus.PLANNING,
        participants: participants.filter(email => email.trim() !== ''),
        destinations: destinations.filter(dest => dest.name.trim() !== ''),
      }

      await tripsApi.create(tripData)
      
      toast({
        title: 'Success',
        description: 'Trip created successfully!',
      })
      
      reset()
      setParticipants([])
      setDestinations([])
      setStartCityValue('')
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create trip',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">Trip Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Summer Vacation in Bali"
          className="w-full"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="destination" className="text-sm font-medium">Destination *</Label>
        <Input
          id="destination"
          placeholder="e.g., Bali, Indonesia"
          className="w-full"
          {...register('destination')}
        />
        {errors.destination && (
          <p className="text-sm text-red-600">{errors.destination.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="startCity" className="text-sm font-medium">Start City *</Label>
        <PlaceAutocomplete
          value={startCityValue}
          onChange={handleStartCityChange}
          onPlaceSelect={handleStartCitySelect}
          placeholder="e.g., New York, USA"
          className="w-full"
        />
        <input type="hidden" {...register('startCity')} />
        {errors.startCity && (
          <p className="text-sm text-red-600">{errors.startCity.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-sm font-medium">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            className="w-full"
            {...register('startDate')}
          />
          {errors.startDate && (
            <p className="text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate" className="text-sm font-medium">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            className="w-full"
            {...register('endDate')}
          />
          {errors.endDate && (
            <p className="text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Additional Destinations (optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDestination}
            className="flex items-center gap-1 text-xs"
          >
            <MapPin className="h-3 w-3" />
            Add Destination
          </Button>
        </div>
        <div className="space-y-3">
          {destinations.map((destination, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-3 bg-gray-50">
              <div className="flex gap-2">
                <PlaceAutocomplete
                  value={destination.name}
                  onChange={(value) => updateDestination(index, 'name', value)}
                  onPlaceSelect={(place) => handleDestinationPlaceSelect(index, place)}
                  placeholder="e.g., Rome, Italy"
                  className="flex-1 bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeDestination(index)}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Arrival Date</Label>
                  <Input
                    type="date"
                    className="bg-white"
                    value={destination.arrivalDate ? new Date(destination.arrivalDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => updateDestination(index, 'arrivalDate', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Departure Date</Label>
                  <Input
                    type="date"
                    className="bg-white"
                    value={destination.departureDate ? new Date(destination.departureDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => updateDestination(index, 'departureDate', e.target.value || undefined)}
                  />
                </div>
              </div>
            </div>
          ))}
          {destinations.length === 0 && (
            <p className="text-sm text-gray-500 italic">No additional destinations added yet. Click "Add Destination" to add stops to your trip.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget" className="text-sm font-medium">Budget (optional)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
          <Input
            id="budget"
            type="number"
            min="0"
            step="0.01"
            placeholder="2000"
            className="w-full pl-8"
            {...register('budget')}
          />
        </div>
        {errors.budget && (
          <p className="text-sm text-red-600">{errors.budget.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Travelers (optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParticipant}
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add Traveler
          </Button>
        </div>
        <div className="space-y-2">
          {participants.map((participant, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="traveler@example.com"
                className="flex-1"
                value={participant}
                onChange={(e) => updateParticipant(index, e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeParticipant(index)}
                className="px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {participants.length === 0 && (
            <p className="text-sm text-gray-500 italic">No travelers added yet. Click "Add Traveler" to invite someone to your trip.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Tell us more about your trip..."
          rows={3}
          className="w-full resize-none"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 pt-6">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="w-full md:w-auto"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full md:w-auto"
        >
          {isSubmitting ? 'Creating...' : 'Create Trip'}
        </Button>
      </div>
    </form>
  )
}
