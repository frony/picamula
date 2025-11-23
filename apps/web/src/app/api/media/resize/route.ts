import { NextRequest, NextResponse } from 'next/server'
import { fileTypeFromFile } from 'file-type'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for video processing

// Configuration constants
const MAX_VIDEO_DURATION = 300 // 5 minutes in seconds
const MAX_VIDEO_DIMENSION = 4096 // Max width/height in pixels
const IMAGE_OUTPUT_QUALITY = 85
const VIDEO_MAX_WIDTH = 1280

// Set explicit FFmpeg paths for different environments
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH)
} else if (process.env.NODE_ENV === 'production') {
  // AlmaLinux typically installs to /usr/bin
  ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg')
  ffmpeg.setFfprobePath('/usr/local/bin/ffprobe')
} else {
  // macOS Homebrew path for development
  try {
    ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg')
    ffmpeg.setFfprobePath('/opt/homebrew/bin/ffprobe')
  } catch (e) {
    console.warn('Could not set FFmpeg path, using system PATH')
  }
}

interface VideoInfo {
  duration: number
  width: number
  height: number
  bitrate: number
}

async function getVideoInfo(inputPath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err)
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      if (!videoStream) {
        return reject(new Error('No video stream found'))
      }
      
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        bitrate: metadata.format.bit_rate || 0,
      })
    })
  })
}

async function resizeMedia(inputPath: string, outputPath: string) {
  // Detect file type
  const type = await fileTypeFromFile(inputPath)
  
  if (!type) {
    throw new Error('Could not determine file type')
  }

  console.log(`Detected: ${type.mime}`)

  // Route to appropriate processor
  if (type.mime.startsWith('image/')) {
    await resizeImage(inputPath, outputPath)
  } else if (type.mime.startsWith('video/')) {
    await resizeVideo(inputPath, outputPath)
  } else {
    throw new Error(`Unsupported type: ${type.mime}`)
  }
  
  return type
}

async function resizeImage(input: string, output: string) {
  // Always output as JPEG for consistency and smaller file size
  await sharp(input)
    .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: IMAGE_OUTPUT_QUALITY })
    .toFile(`${output}.jpg`)
  
  console.log('Image resized successfully')
}

async function resizeVideo(input: string, output: string) {
  // Validate video before processing
  const videoInfo = await getVideoInfo(input)
  
  console.log('Video info:', {
    duration: `${videoInfo.duration.toFixed(2)}s`,
    dimensions: `${videoInfo.width}x${videoInfo.height}`,
    bitrate: `${(videoInfo.bitrate / 1000000).toFixed(2)} Mbps`,
  })
  
  // Validation checks
  if (videoInfo.duration > MAX_VIDEO_DURATION) {
    throw new Error(`Video too long (max ${MAX_VIDEO_DURATION / 60} minutes). Duration: ${(videoInfo.duration / 60).toFixed(1)} minutes`)
  }
  
  if (videoInfo.width > MAX_VIDEO_DIMENSION || videoInfo.height > MAX_VIDEO_DIMENSION) {
    throw new Error(`Video dimensions too large (max ${MAX_VIDEO_DIMENSION}px). Current: ${videoInfo.width}x${videoInfo.height}`)
  }
  
  return new Promise((resolve, reject) => {
    // Use mp4 as output format for better compatibility
    const outputFile = `${output}.mp4`
    
    ffmpeg(input)
      .size(`${VIDEO_MAX_WIDTH}x?`)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 28',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-max_muxing_queue_size 1024', // Prevent muxing errors
      ])
      .output(outputFile)
      .on('start', (cmd) => {
        console.log('FFmpeg command:', cmd)
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          const percent = Math.round(progress.percent)
          console.log(`Processing: ${percent}% done | Time: ${progress.timemark} | FPS: ${progress.currentFps}`)
        }
      })
      .on('end', () => {
        console.log('Video processing completed successfully')
        resolve(undefined)
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err)
        reject(new Error(`Video processing failed: ${err.message}`))
      })
      .run()
  })
}

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null
  let tempOutputPath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`Processing file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)

    // Create temp directory
    const tempDir = join(tmpdir(), 'juntatribo-uploads')
    await mkdir(tempDir, { recursive: true })

    // Generate unique filenames
    const uniqueId = randomUUID()
    tempInputPath = join(tempDir, `${uniqueId}-input`)
    tempOutputPath = join(tempDir, `${uniqueId}-output`)

    // Write uploaded file to temp location
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(tempInputPath, buffer)

    // Process the file using the provided code
    const type = await resizeMedia(tempInputPath, tempOutputPath)

    // Read the processed file - always jpg for images, mp4 for videos
    const outputExt = type.mime.startsWith('video/') ? 'mp4' : 'jpg'
    const outputFile = `${tempOutputPath}.${outputExt}`
    const fs = await import('fs/promises')
    const processedBuffer = await fs.readFile(outputFile)

    console.log(`Output size: ${(processedBuffer.length / 1024 / 1024).toFixed(2)} MB`)

    // Clean up output file
    await unlink(outputFile).catch(() => {})

    // Convert to base64 for response
    const base64Data = processedBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      data: base64Data,
      mimeType: type.mime.startsWith('video/') ? 'video/mp4' : 'image/jpeg',
      originalName: file.name,
    })
  } catch (error: any) {
    console.error('Error processing file:', error)
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to process file'
    
    if (error.message?.includes('Video too long')) {
      errorMessage = error.message
    } else if (error.message?.includes('dimensions too large')) {
      errorMessage = error.message
    } else if (error.message?.includes('FFmpeg')) {
      errorMessage = 'Video processing failed. Please ensure the file is a valid video format.'
    } else if (error.message?.includes('Could not determine file type')) {
      errorMessage = 'Unsupported file format'
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  } finally {
    // Clean up temp files
    try {
      if (tempInputPath) await unlink(tempInputPath).catch(() => {})
      if (tempOutputPath) {
        // Clean up standardized output files
        await unlink(`${tempOutputPath}.mp4`).catch(() => {})
        await unlink(`${tempOutputPath}.jpg`).catch(() => {})
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}
