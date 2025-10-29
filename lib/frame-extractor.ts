/**
 * Frame Extraction System
 * Extracts frames from video Blob at 1 frame per second for CV analysis
 */

/**
 * Get actual duration from video blob (more reliable than recording timer)
 */
export async function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(video.src)
      video.remove()
      reject(new Error('Timeout loading video duration'))
    }, 10000)
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout)
      const duration = Math.floor(video.duration)
      URL.revokeObjectURL(video.src)
      video.remove()
      resolve(duration)
    }
    
    video.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(video.src)
      video.remove()
      reject(new Error('Failed to load video'))
    }
    
    video.src = URL.createObjectURL(blob)
  })
}

export interface ExtractedFrame {
  frameNumber: number
  timestamp: number // seconds from video start
  base64Image: string // base64 encoded JPEG
  width: number
  height: number
}

export interface ExtractionProgress {
  currentFrame: number
  totalFrames: number
  percentComplete: number
}

export interface ExtractionResult {
  frames: ExtractedFrame[]
  totalFrames: number
  duration: number
  videoWidth: number
  videoHeight: number
}

/**
 * Extract frames from a video Blob at 1 frame per second
 * @param blob - The video Blob from MediaRecorder
 * @param duration - Duration of the video in seconds
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with extracted frames as base64 images
 */
export async function extractFrames(
  blob: Blob,
  duration: number,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractionResult> {
  return new Promise((resolve, reject) => {
    // Create video element to load the blob
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous' // Allow canvas to read video

    // Create canvas for frame extraction
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    // Create object URL for the blob
    const videoUrl = URL.createObjectURL(blob)
    video.src = videoUrl

    const frames: ExtractedFrame[] = []
    let currentFrameIndex = 0
    const totalFrames = Math.floor(duration) // 1 frame per second

    // Add timeout for metadata loading
    const metadataTimeout = setTimeout(() => {
      URL.revokeObjectURL(videoUrl)
      video.remove()
      canvas.remove()
      reject(new Error('Video metadata loading timed out. Try recording again.'))
    }, 10000) // 10 second timeout

    video.onloadedmetadata = () => {
      clearTimeout(metadataTimeout)
      
      // Ensure video dimensions are valid
      if (!video.videoWidth || !video.videoHeight) {
        URL.revokeObjectURL(videoUrl)
        video.remove()
        canvas.remove()
        reject(new Error('Invalid video dimensions. Please try recording again.'))
        return
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      console.log(`📹 Video loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${duration}s`)

      // Start extracting frames
      extractNextFrame()
    }

    video.onerror = (e) => {
      clearTimeout(metadataTimeout)
      URL.revokeObjectURL(videoUrl)
      video.remove()
      canvas.remove()
      reject(new Error('Failed to load video. Please try recording again.'))
    }

    function extractNextFrame() {
      if (currentFrameIndex >= totalFrames) {
        // All frames extracted, clean up and resolve
        URL.revokeObjectURL(videoUrl)
        video.remove()
        canvas.remove()

        resolve({
          frames,
          totalFrames: frames.length,
          duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        })
        return
      }

      // Seek to the next second
      const timestamp = currentFrameIndex
      video.currentTime = timestamp

      video.onseeked = () => {
        try {
          if (!ctx) {
            throw new Error('Canvas context lost')
          }

          // Draw current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert canvas to base64 JPEG with higher quality for better CV detection
          const base64Image = canvas.toDataURL('image/jpeg', 0.95)

          // Store the frame
          frames.push({
            frameNumber: currentFrameIndex + 1,
            timestamp,
            base64Image,
            width: canvas.width,
            height: canvas.height,
          })

          // Report progress
          if (onProgress) {
            onProgress({
              currentFrame: currentFrameIndex + 1,
              totalFrames,
              percentComplete: Math.round(((currentFrameIndex + 1) / totalFrames) * 100),
            })
          }

          // Move to next frame
          currentFrameIndex++
          extractNextFrame()
        } catch (error) {
          URL.revokeObjectURL(videoUrl)
          video.remove()
          canvas.remove()
          reject(new Error(`Failed to extract frame ${currentFrameIndex}: ${error}`))
        }
      }

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl)
        video.remove()
        canvas.remove()
        reject(new Error('Video loading failed'))
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl)
      reject(new Error('Failed to load video metadata'))
    }
  })
}

/**
 * Calculate average brightness of a frame (0-255)
 * Used for video quality validation
 */
export function calculateFrameBrightness(base64Image: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      let totalBrightness = 0

      // Calculate average brightness using luminance formula
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        // Luminance formula: 0.299*R + 0.587*G + 0.114*B
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b
        totalBrightness += brightness
      }

      const avgBrightness = totalBrightness / (data.length / 4)
      canvas.remove()
      resolve(avgBrightness)
    }

    img.onerror = () => {
      canvas.remove()
      reject(new Error('Failed to load image for brightness calculation'))
    }

    img.src = base64Image
  })
}
