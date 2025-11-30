'use client'

import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import { compressImage, compressVideo } from '../lib/media-upload'

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
  status: 'pending' | 'compressing' | 'completed' | 'error'
  compressedFile?: File // Compressed file ready for upload
  compressionProgress?: number // 0-100
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
const MAX_FILE_SIZE = 1000 * 1024 * 1024 // 1GB
const MAX_VIDEO_SIZE = 1000 * 1024 * 1024 // 1GB

export function useMediaUpload(): UseMediaUploadReturn {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

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

    // Create error media files
    const errorMediaFiles: MediaFile[] = errors.map((error) => {
      const file = fileArray.find(f => f.name === error.file)!
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: '', // Don't create object URL for error files
        status: 'error' as const,
        error: error.reason,
      }
    })

    if (errors.length > 0) {
      console.error('File validation errors:', errors)
      setMediaFiles((prev) => [...prev, ...errorMediaFiles])
      
      toast({
        title: 'Some files were rejected',
        description: `${errors.length} file(s) had validation errors`,
        variant: 'destructive',
      })
    }

    if (validFiles.length === 0) return

    // Create media file objects
    const newMediaFiles: MediaFile[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      compressionProgress: 0,
    }))

    setMediaFiles((prev) => [...prev, ...newMediaFiles])
    setIsProcessing(true)

    // Process files one by one
    for (const mediaFile of newMediaFiles) {
      try {
        setMediaFiles((prev) =>
          prev.map((f) =>
            f.id === mediaFile.id ? { ...f, status: 'compressing' as const, compressionProgress: 0 } : f
          )
        )

        console.log(`Starting compression for: ${mediaFile.file.name}`)
        const startTime = Date.now()

        const isImage = mediaFile.file.type.startsWith('image/')
        const isVideo = mediaFile.file.type.startsWith('video/')

        let compressedFile: File

        if (isImage) {
          compressedFile = await compressImage(
            mediaFile.file,
            1920,
            1080,
            0.85
          )
          // Update progress to 100% after completion since compressImage doesn't report progress
          setMediaFiles((prev) =>
            prev.map((f) =>
              f.id === mediaFile.id ? { ...f, compressionProgress: 100 } : f
            )
          )
        } else if (isVideo) {
          compressedFile = await compressVideo(
            mediaFile.file,
            1920,
            '2M',
            (progress) => {
              setMediaFiles((prev) =>
                prev.map((f) =>
                  f.id === mediaFile.id ? { ...f, compressionProgress: progress } : f
                )
              )
            }
          )
        } else {
          compressedFile = mediaFile.file
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`Compression completed for ${mediaFile.file.name} in ${duration}s`)

        setMediaFiles((prev) =>
          prev.map((f) =>
            f.id === mediaFile.id
              ? {
                  ...f,
                  status: 'completed' as const,
                  compressedFile,
                  compressionProgress: 100,
                  mimeType: compressedFile.type,
                }
              : f
          )
        )

        toast({
          title: 'File compressed',
          description: `${mediaFile.file.name} ready for upload`,
        })

      } catch (error: any) {
        console.error('Error compressing file:', error)
        const errorMessage = error.message || 'Failed to compress file'
        
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

        toast({
          title: 'Compression failed',
          description: `${mediaFile.file.name}: ${errorMessage}`,
          variant: 'destructive',
        })
      }
    }

    setIsProcessing(false)
  }, [toast])

  const removeFile = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) {
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
