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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { TripStatus, TRIP_STATUS_LABELS } from '@junta-tribo/shared'
import type { UpdateTripDto, Trip } from '@junta-tribo/shared'
import { X, Plus } from 'lucide-react'

const editTripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  destination: z.string().min(1, 'Destination is required').max(100, 'Destination must be less than 100 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budget: z.string().optional(),
  status: z.nativeEnum(TripStatus),
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

type EditTripFormData = z.infer<typeof editTripSchema>

interface EditTripFormProps {
  trip: Trip
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditTripForm({ trip, onSuccess, onCancel }: EditTripFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [participants, setParticipants] = useState<string[]>(trip.participants || [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditTripFormData>({
    resolver: zodResolver(editTripSchema),
    defaultValues: {
      title: trip.title,
      description: trip.description || '',
      destination: trip.destination,
      startDate: new Date(trip.startDate).toISOString().split('T')[0],
      endDate: new Date(trip.endDate).toISOString().split('T')[0],
      budget: trip.budget ? trip.budget.toString() : '',
      status: trip.status,
    },
  })

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

  const watchedStatus = watch('status')

  const onSubmit = async (data: EditTripFormData) => {
    setIsSubmitting(true)
    
    try {
      const tripData: UpdateTripDto = {
        title: data.title,
        description: data.description || undefined,
        destination: data.destination,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        budget: data.budget ? parseFloat(data.budget) : undefined,
        status: data.status,
        participants: participants.filter(email => email.trim() !== ''),
      }

      await tripsApi.update(trip.slug, tripData)
      
      toast({
        title: 'Success',
        description: 'Trip updated successfully!',
      })
      
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update trip',
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="status" className="text-sm font-medium">Status *</Label>
          <Select
            value={watchedStatus}
            onValueChange={(value) => setValue('status', value as TripStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TripStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {TRIP_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>
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
          {isSubmitting ? 'Updating...' : 'Update Trip'}
        </Button>
      </div>
    </form>
  )
}
