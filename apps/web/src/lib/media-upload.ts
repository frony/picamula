import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import api from './api'
import { LOCAL_STORAGE_KEYS } from '@junta-tribo/shared'


// FFmpeg core version - can be configured via environment variable
// Remove any quotes that might be in the environment variable
const FFMPEG_CORE_VERSION = (process.env.NEXT_PUBLIC_FFMPEG_CORE_VERSION || '0.12.6').replace(/["']/g, '')

export interface UploadedMediaFile {
  key: string
  url: string
  type: 'image' | 'video'
  originalName: string
  mimeType: string
  size: number
}

// Singleton FFmpeg instance
let ffmpegInstance: FFmpeg | null = null
let ffmpegLoaded = false

/**
 * Initialize FFmpeg instance (lazy loading)
 */
async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance
  }

  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg()
  }

  if (!ffmpegLoaded) {
    try {
      const baseURL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`
      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegLoaded = true
      console.log('FFmpeg loaded successfully')
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      throw error
    }
  }

  return ffmpegInstance
}

/**
 * Compress an image file using Canvas API
 * FileReader is a browser Web API for reading file contents
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileReader
 * @param file - Original image file
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1080)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Compressed image file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        let width = img.width
        let height = img.height
        
        // Calculate aspect ratio and scale down to fit within max dimensions
        // This handles both width and height constraints properly
        const widthRatio = maxWidth / width
        const heightRatio = maxHeight / height
        const scale = Math.min(widthRatio, heightRatio, 1) // Don't upscale if smaller
        
        width = Math.round(width * scale)
        height = Math.round(height * scale)
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to blob as JPEG
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'))
              return
            }
            
            // Create new file from blob with .jpg extension
            const originalName = file.name.replace(/\.[^/.]+$/, '.jpg')
            const compressedFile = new File([blob], originalName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            
            console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compress a video file using FFmpeg.wasm
 * @param file - Original video file
 * @param maxWidth - Maximum width (default: 1920 for 1080p)
 * @param bitrate - Target bitrate (default: '2M' for 2 Mbps)
 * @param onProgress - Progress callback (0-100)
 * @returns Compressed video file
 */
export async function compressVideo(
  file: File,
  maxWidth: number = 1920,
  bitrate: string = '2M',
  onProgress?: (progress: number) => void
): Promise<File> {
  try {
    const ffmpeg = await loadFFmpeg()
    
    // Set up progress callback
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100))
      })
    }

    const inputName = 'input.mp4'
    const outputName = 'output.mp4'
    
    // Write input file to FFmpeg virtual file system
    await ffmpeg.writeFile(inputName, await fetchFile(file))
    
    // Compress video with H.264 codec
    // -c:v libx264: Use H.264 video codec
    // -preset fast: Encoding speed preset
    // -b:v: Target video bitrate
    // -vf scale: Scale video (maintaining aspect ratio)
    // -c:a aac: Use AAC audio codec
    // -b:a 128k: Audio bitrate
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-b:v', bitrate,
      '-vf', `scale='min(${maxWidth},iw)':'min(${maxWidth}*ih/iw,ih)'`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart', // Enable streaming
      outputName
    ])
    
    // Read compressed file
    const data = await ffmpeg.readFile(outputName)
    
    // Clean up
    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)
    
    // Convert FileData (Uint8Array) to proper Blob format
    // FileData from ffmpeg is already a Uint8Array, just ensure it's the right type
    const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data as any)
    const compressedBlob = new Blob([uint8Array.buffer], { type: 'video/mp4' })
    const compressedFile = new File([compressedBlob], file.name, {
      type: 'video/mp4',
      lastModified: Date.now(),
    })
    
    console.log(`Video compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
    
    return compressedFile
  } catch (error) {
    console.error('Video compression failed:', error)
    throw error
  }
}

/**
 * Prepare a file for upload (compress if needed)
 * Images: compressed using Canvas API
 * Videos: compressed using FFmpeg.wasm
 */
async function prepareFileForUpload(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  
  if (isImage) {
    // Compress images on the frontend
    try {
      onProgress?.(0)
      const compressed = await compressImage(file)
      onProgress?.(100)
      return compressed
    } catch (error) {
      console.warn('Image compression failed, uploading original:', error)
      return file
    }
  }
  
  if (isVideo) {
    // Compress videos on the frontend
    try {
      return await compressVideo(file, 1920, '2M', onProgress)
    } catch (error) {
      console.warn('Video compression failed, uploading original:', error)
      return file
    }
  }
  
  // For non-media files, return as-is
  return file
}

/**
 * Upload a single media file
 */
export async function uploadMediaFile(
  tripId: number,
  file: File,
  onCompressionProgress?: (progress: number) => void
): Promise<UploadedMediaFile> {
  // Prepare file (compress if image/video)
  const preparedFile = await prepareFileForUpload(file, onCompressionProgress)
  
  const formData = new FormData()
  formData.append('file', preparedFile)

  const response = await api.post(
    `/trips/${tripId}/media/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data
}

/**
 * Upload multiple media files
 */
export async function uploadMediaFiles(
  tripId: number,
  files: File[],
  onProgress?: (completed: number, total: number) => void,
  onFileCompressionProgress?: (fileName: string, progress: number) => void
): Promise<UploadedMediaFile[]> {
  const uploadedFiles: UploadedMediaFile[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const result = await uploadMediaFile(
        tripId, 
        file,
        (progress) => onFileCompressionProgress?.(file.name, progress)
      )
      uploadedFiles.push(result)
      onProgress?.(i + 1, files.length)
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error)
      throw error
    }
  }

  return uploadedFiles
}
