import axios from 'axios'

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.juntatribo.com/api' 
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001')

export interface UploadedMediaFile {
  key: string
  url: string
  type: 'image' | 'video'
  originalName: string
  mimeType: string
  size: number
}

/**
 * Upload a single media file to S3
 */
export async function uploadMediaFile(
  tripId: number,
  file: File,
  token: string
): Promise<UploadedMediaFile> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await axios.post(
    `${API_BASE_URL}/trips/${tripId}/media/upload`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data
}

/**
 * Upload multiple media files to S3
 */
export async function uploadMediaFiles(
  tripId: number,
  files: File[],
  token: string,
  onProgress?: (completed: number, total: number) => void
): Promise<UploadedMediaFile[]> {
  const uploadedFiles: UploadedMediaFile[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const result = await uploadMediaFile(tripId, file, token)
      uploadedFiles.push(result)
      onProgress?.(i + 1, files.length)
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error)
      throw error
    }
  }

  return uploadedFiles
}
