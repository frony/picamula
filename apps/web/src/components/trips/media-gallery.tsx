'use client'

import { useState, useEffect } from 'react'
import { MediaFile, MediaFileType } from '@junta-tribo/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Image as ImageIcon, Video, Play, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mediaApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface MediaGalleryProps {
  mediaFiles: MediaFile[]
  tripId: number
  isOwner: boolean
  onMediaDeleted?: () => void
}

export function MediaGallery({ mediaFiles, tripId, isOwner, onMediaDeleted }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()

  // Debug: Log mediaFiles to console
  useEffect(() => {
    console.log('MediaGallery received mediaFiles:', mediaFiles)
  }, [mediaFiles])

  const handleDelete = async (mediaId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the media viewer

    if (!confirm('Are you sure you want to delete this media file? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(mediaId)
      await mediaApi.delete(tripId, mediaId)
      
      toast({
        title: 'Success',
        description: 'Media file deleted successfully',
      })

      // Call the callback to refresh the trip data
      onMediaDeleted?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete media file',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (!mediaFiles || mediaFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-pink-600" />
            Photos & Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No media files yet</p>
            <p className="text-sm">Upload photos and videos to capture your memories</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const images = mediaFiles.filter(m => m.type === MediaFileType.IMAGE)
  const videos = mediaFiles.filter(m => m.type === MediaFileType.VIDEO)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-pink-600" />
            Photos & Videos
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({images.length} {images.length === 1 ? 'photo' : 'photos'}, {videos.length} {videos.length === 1 ? 'video' : 'videos'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mediaFiles
              .sort((a, b) => a.order - b.order)
              .map((media) => (
                <div
                  key={media.id}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-gray-100 hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedMedia(media)}
                >
                  {isOwner && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(media.id, e)}
                      disabled={deletingId === media.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {media.type === MediaFileType.IMAGE ? (
                    <>
                      <img
                        src={media.url}
                        alt={media.originalName || 'Trip photo'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Failed to load image:', media.url)
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage Error%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Debug overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                        {media.url.substring(0, 50)}...
                      </div>
                    </>
                  ) : (
                    <>
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                        <div className="bg-white rounded-full p-3 shadow-lg">
                          <Play className="w-6 h-6 text-gray-800" fill="currentColor" />
                        </div>
                      </div>
                      {media.duration && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                          {formatDuration(media.duration)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Media Viewer Dialog */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl w-full p-0">
            <div className="relative bg-black">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedMedia(null)}
              >
                <X className="w-6 h-6" />
              </Button>

              {selectedMedia.type === MediaFileType.IMAGE ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.originalName || 'Trip photo'}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[80vh]"
                >
                  Your browser does not support the video tag.
                </video>
              )}

              {selectedMedia.originalName && (
                <div className="bg-black bg-opacity-75 text-white p-4">
                  <p className="text-sm">{selectedMedia.originalName}</p>
                  {selectedMedia.size && (
                    <p className="text-xs text-gray-400">
                      {formatFileSize(selectedMedia.size)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// Helper function to format duration (seconds to MM:SS)
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
