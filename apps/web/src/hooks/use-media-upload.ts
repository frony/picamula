'use client'

import { useState, useCallback } from 'react'

interface ResizeResult {
  success: boolean
  data?: string
  error?: string
  mimeType?: string
  originalName?: string
}

export interface MediaFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  resizedData?: string // Base64 encoded resized file
  mimeType?: string
  error?: string
}

interface UseMediaUploadReturn {
  mediaFiles: MediaFile[]
  isProcessing: boolean
  addFiles: (files: FileList | File[]) => Promise<void>
  removeFile: (id: string) => void
  clearAll: () => void
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
const MAX_FILE_SIZE = 1000 * 1024 * 1024 // 1GB for images
const MAX_VIDEO_SIZE = 1000 * 1024 * 1024 // 1GB for videos
const MAX_VIDEO_DURATION_MINUTES = 5 // Matches backend MAX_VIDEO_DURATION

export function useMediaUpload(): UseMediaUploadReturn {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    console.log('=== FILES SELECTED ===')
    fileArray.forEach((file, index) => {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2)
      console.log(`File ${index + 1}: ${file.name}`)
      console.log(`  Type: ${file.type}`)
      console.log(`  Size: ${sizeMB} MB`)
    })
    
    // Validate files
    const validFiles: File[] = []
    const errors: { file: string; reason: string }[] = []

    fileArray.forEach((file) => {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type)
      const isValidType = isImage || isVideo
      
      // Check size limits based on file type
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE
      const isValidSize = file.size <= maxSize

      if (!isValidType) {
        errors.push({ file: file.name, reason: `Unsupported type: ${file.type}` })
        console.warn(`File ${file.name} has unsupported type: ${file.type}`)
      } else if (!isValidSize) {
        const maxSizeMB = Math.round(maxSize / 1024 / 1024)
        errors.push({ file: file.name, reason: `Exceeds ${maxSizeMB}MB limit` })
        console.warn(`File ${file.name} exceeds maximum size of ${maxSizeMB}MB`)
      } else {
        validFiles.push(file)
      }
    })

    // Create error media files to show in UI
    const errorMediaFiles: MediaFile[] = []
    errors.forEach((error) => {
      const file = fileArray.find(f => f.name === error.file)
      if (file) {
        // Create preview URL for both images and videos
        const shouldCreatePreview = file.type.startsWith('image/') || file.type.startsWith('video/')
        errorMediaFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview: shouldCreatePreview ? URL.createObjectURL(file) : '',
          status: 'error',
          error: error.reason,
        })
      }
    })

    // Show errors if any
    if (errors.length > 0) {
      console.error('File validation errors:', errors)
      // Add error files to state so user can see them
      if (errorMediaFiles.length > 0) {
        setMediaFiles((prev) => [...prev, ...errorMediaFiles])
      }
    }

    if (validFiles.length === 0) return

    // Create media file objects with preview URLs
    const newMediaFiles: MediaFile[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }))

    setMediaFiles((prev) => [...prev, ...newMediaFiles])
    setIsProcessing(true)

    // Process files one by one
    for (const mediaFile of newMediaFiles) {
      try {
        // Update status to processing
        setMediaFiles((prev) =>
          prev.map((f) =>
            f.id === mediaFile.id ? { ...f, status: 'processing' as const } : f
          )
        )

        console.log(`Starting upload for: ${mediaFile.file.name}`)
        const startTime = Date.now()

        // Create FormData for multipart upload
        const formData = new FormData()
        formData.append('file', mediaFile.file)

        // Add timeout wrapper (increased to 5 minutes for large video processing)
        const timeoutMs = mediaFile.file.type.startsWith('video/') ? 300000 : 60000 // 5 min for videos, 1 min for images
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Processing timeout (${timeoutMs / 1000}s)`)), timeoutMs)
        )
        
        // Call API route with FormData
        const uploadPromise = fetch('/api/media/resize', {
          method: 'POST',
          body: formData,
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to process file')
          }
          return response.json()
        })
        
        const result = await Promise.race([
          uploadPromise,
          timeoutPromise
        ])

        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`Processing completed for ${mediaFile.file.name} in ${duration}s`)

        if (result.success && result.data) {
          // Update with resized data
          setMediaFiles((prev) =>
            prev.map((f) =>
              f.id === mediaFile.id
                ? {
                    ...f,
                    status: 'completed' as const,
                    resizedData: result.data,
                    mimeType: result.mimeType,
                  }
                : f
            )
          )
        } else {
          // Update with error
          setMediaFiles((prev) =>
            prev.map((f) =>
              f.id === mediaFile.id
                ? {
                    ...f,
                    status: 'error' as const,
                    error: result.error || 'Failed to resize media',
                  }
                : f
            )
          )
        }
      } catch (error: any) {
        console.error('Error processing file:', error)
        let errorMessage = error.message || 'Failed to process file'
        
        // Provide user-friendly error messages
        if (errorMessage.includes('timeout')) {
          errorMessage = `Processing timed out. Videos over ${MAX_VIDEO_DURATION_MINUTES} minutes are not supported.`
        } else if (errorMessage.includes('fetch')) {
          errorMessage = 'Network error - file may be too large'
        } else if (errorMessage.includes('Video too long')) {
          errorMessage = `Video exceeds ${MAX_VIDEO_DURATION_MINUTES} minute limit`
        } else if (errorMessage.includes('dimensions too large')) {
          errorMessage = 'Video dimensions too large'
        }
        
        setMediaFiles((prev) =>
          prev.map((f) =>
            f.id === mediaFile.id
              ? {
                  ...f,
                  status: 'error' as const,
                  error: errorMessage,
                }
              : f
          )
        )
      }
    }

    setIsProcessing(false)
  }, [])

  const removeFile = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) {
        // Revoke preview URL to free memory
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    mediaFiles.forEach((file) => {
      URL.revokeObjectURL(file.preview)
    })
    setMediaFiles([])
  }, [mediaFiles])

  return {
    mediaFiles,
    isProcessing,
    addFiles,
    removeFile,
    clearAll,
  }
}
