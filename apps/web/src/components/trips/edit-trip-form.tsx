'use client'

import { useState, useRef } from 'react'
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
import { TripStatus, TRIP_STATUS_LABELS, LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'
import type { UpdateTripDto, Trip } from '@junta-tribo/shared'
import { X, Plus, Upload, Image as ImageIcon, Video, Loader2 } from 'lucide-react'
import { useMediaUpload } from '@/hooks/use-media-upload'

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
  const { mediaFiles, isProcessing, addFiles, removeFile } = useMediaUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addFiles(e.target.files)
      // Reset the input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

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

      // Upload media files if any are completed
      const completedMedia = mediaFiles.filter(f => f.status === 'completed')
      if (completedMedia.length > 0) {
        try {
          // Get auth token
          const token = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
          if (!token) {
            throw new Error('Not authenticated')
          }

          toast({
            title: 'Uploading media...',
            description: `Uploading ${completedMedia.length} file(s) to cloud storage`,
          })

          // Upload each completed media file to S3 (use compressed file)
          const uploadResults = []
          for (let i = 0; i < completedMedia.length; i++) {
            const media = completedMedia[i]
            try {
              const formData = new FormData()
              // Use compressed file if available, otherwise use original
              const fileToUpload = media.compressedFile || media.file
              formData.append('file', fileToUpload)

              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
              const response = await fetch(
                `${apiUrl}/trips/${trip.id}/media/upload`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                  body: formData,
                }
              )

              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || `Failed to upload ${media.file.name}`)
              }

              const result = await response.json()
              uploadResults.push({
                key: result.key,
                url: result.url,
                type: result.type,
                originalName: result.originalName,
                mimeType: result.mimeType,
                size: result.size,
                order: i,
              })

              toast({
                title: 'Upload progress',
                description: `Uploaded ${i + 1}/${completedMedia.length} files`,
              })
            } catch (error) {
              console.error(`Failed to upload ${media.file.name}:`, error)
              throw error
            }
          }

          // Add media files metadata to trip data
          tripData.mediaFiles = uploadResults
        } catch (uploadError: any) {
          toast({
            title: 'Upload Error',
            description: uploadError.message || 'Failed to upload media files',
            variant: 'destructive',
          })
          setIsSubmitting(false)
          return
        }
      }

      // Update trip with or without media
      await tripsApi.update(trip.slug, tripData)

      toast({
        title: 'Success',
        description: completedMedia.length > 0
          ? `Trip updated with ${completedMedia.length} media file(s)!`
          : 'Trip updated successfully!',
      })

      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to update trip',
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

      {/* Media Upload Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Photos & Videos (optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-1 text-xs"
          >
            <Upload className="h-3 w-3" />
            {isProcessing ? 'Processing...' : 'Upload Media'}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/webm"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {mediaFiles.map((media) => (
              <div
                key={media.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
              >
                {/* Preview */}
                {media.file.type.startsWith('image/') ? (
                  media.preview ? (
                    <img
                      src={media.preview}
                      alt={media.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )
                ) : media.file.type.startsWith('video/') ? (
                  media.preview ? (
                    <div className="relative w-full h-full bg-gray-900">
                      <video
                        src={media.preview}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedData={(e) => {
                          // Seek to 1 second to show a thumbnail frame
                          const video = e.currentTarget
                          video.currentTime = 1
                        }}
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        Video
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Video className="h-12 w-12 text-gray-400" />
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Video className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Status Overlay */}
                {media.status === 'compressing' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white px-2">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                      <p className="text-xs font-semibold">Compressing...</p>
                      {media.compressionProgress !== undefined && (
                        <p className="text-xs mt-1 opacity-80">{media.compressionProgress}%</p>
                      )}
                      {media.file.type.startsWith('video/') && (
                        <p className="text-xs mt-1 opacity-80">May take 2-5 min</p>
                      )}
                    </div>
                  </div>
                )}

                {media.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/90 flex items-center justify-center">
                    <div className="text-center text-white p-2">
                      <X className="h-6 w-6 mx-auto mb-1" />
                      <p className="text-xs font-semibold">Error</p>
                      <p className="text-xs mt-1">{media.error || 'Failed to process'}</p>
                    </div>
                  </div>
                )}

                {media.status === 'completed' && (
                  <div className="absolute top-1 left-1 bg-green-500 text-white rounded-full p-1">
                    <ImageIcon className="h-3 w-3" />
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFile(media.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  disabled={media.status === 'compressing'}
                >
                  <X className="h-3 w-3" />
                </button>

                {/* File Name */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-1 text-xs truncate">
                  {media.file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {mediaFiles.length === 0 && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500 mb-1">
              Click "Upload Media" to add photos or videos
            </p>
            <p className="text-xs text-gray-400">
              Images: JPEG, PNG, GIF, WebP | Videos: MP4, MOV, WebM | All files auto-resized
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800 flex items-center gap-1 font-semibold mb-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Compressing media files...
            </p>
            <p className="text-xs text-blue-600">
              Images: ~5 seconds | Videos: 2-5 minutes depending on size
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500 italic">
          Note: Images resized to 800x600px, Videos resized to 1280px width. Large files may take several minutes.
        </p>
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
