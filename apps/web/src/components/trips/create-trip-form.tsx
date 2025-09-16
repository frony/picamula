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
import { TripStatus } from '@junta-tribo/shared'
import type { CreateTripDto } from '@junta-tribo/shared'

const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  destination: z.string().min(1, 'Destination is required').max(100, 'Destination must be less than 100 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budget: z.string().optional(),
}).refine((data) => {
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)
  return endDate >= startDate
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
})

type CreateTripFormData = z.infer<typeof createTripSchema>

interface CreateTripFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreateTripForm({ onSuccess, onCancel }: CreateTripFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTripFormData>({
    resolver: zodResolver(createTripSchema),
  })

  const onSubmit = async (data: CreateTripFormData) => {
    setIsSubmitting(true)
    
    try {
      const tripData: CreateTripDto = {
        title: data.title,
        description: data.description || undefined,
        destination: data.destination,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        budget: data.budget ? parseFloat(data.budget) : undefined,
        status: TripStatus.PLANNING,
      }

      await tripsApi.create(tripData)
      
      toast({
        title: 'Success',
        description: 'Trip created successfully!',
      })
      
      reset()
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
