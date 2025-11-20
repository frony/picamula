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

async function resizeMedia(inputPath: string, outputPath: string) {
  // Detect file type
  const type = await fileTypeFromFile(inputPath)
  
  if (!type) {
    throw new Error('Could not determine file type')
  }

  console.log(`Detected: ${type.mime}`)

  // Route to appropriate processor
  if (type.mime.startsWith('image/')) {
    await resizeImage(inputPath, outputPath, type.ext)
  } else if (type.mime.startsWith('video/')) {
    await resizeVideo(inputPath, outputPath, type.ext)
  } else {
    throw new Error(`Unsupported type: ${type.mime}`)
  }
  
  return type
}

async function resizeImage(input: string, output: string, ext: string) {
  await sharp(input)
    .resize(800, 600, { fit: 'inside' })
    .toFile(`${output}.${ext}`)
}

async function resizeVideo(input: string, output: string, ext: string) {
  return new Promise((resolve, reject) => {
    // Use mp4 as output format for better compatibility
    const outputFile = `${output}.mp4`
    
    ffmpeg(input)
      .size('1280x?')
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 28',
        '-movflags +faststart',
        '-pix_fmt yuv420p',
      ])
      .output(outputFile)
      .on('start', (cmd) => {
        console.log('FFmpeg command:', cmd)
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Processing: ${Math.round(progress.percent)}% done`)
        }
      })
      .on('end', resolve)
      .on('error', reject)
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

    // Read the processed file
    const outputExt = type.mime.startsWith('video/') ? 'mp4' : type.ext
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
      mimeType: type.mime.startsWith('video/') ? 'video/mp4' : type.mime,
      originalName: file.name,
    })
  } catch (error: any) {
    console.error('Error processing file:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process file' },
      { status: 500 }
    )
  } finally {
    // Clean up temp files
    try {
      if (tempInputPath) await unlink(tempInputPath).catch(() => {})
      if (tempOutputPath) {
        // Clean up any output files with various extensions
        await unlink(`${tempOutputPath}.mp4`).catch(() => {})
        await unlink(`${tempOutputPath}.jpg`).catch(() => {})
        await unlink(`${tempOutputPath}.png`).catch(() => {})
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

