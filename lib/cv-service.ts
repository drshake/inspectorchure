/**
 * Computer Vision Detection Service
 * Integrates with Google Cloud Vision API for food safety analysis
 */

export interface CVLabel {
  description: string
  score: number // confidence 0-1
  mid?: string // machine-generated identifier
}

export interface CVDetectionResult {
  labels: CVLabel[]
  frameNumber: number
  timestamp: number
}

export interface CVBatchResult {
  detections: CVDetectionResult[]
  totalFrames: number
  averageConfidence: number
}

/**
 * Send a single frame to Google Cloud Vision API
 * @param base64Image - Base64 encoded image (with or without data URI prefix)
 * @param frameNumber - Frame number for tracking
 * @param timestamp - Timestamp in video (seconds)
 * @returns Detection result with labels and confidence scores
 */
export async function detectLabels(
  base64Image: string,
  frameNumber: number,
  timestamp: number
): Promise<CVDetectionResult> {
  // Remove data URI prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')

  try {
    const response = await fetch('/api/vision/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data,
        frameNumber,
        timestamp,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'CV detection failed')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error(`CV detection failed for frame ${frameNumber}:`, error)
    throw error
  }
}

/**
 * Process multiple frames in batch with parallel processing
 * @param frames - Array of base64 images with metadata
 * @param onProgress - Optional progress callback
 * @returns Batch result with all detections
 */
export async function detectLabelsBatch(
  frames: Array<{ base64Image: string; frameNumber: number; timestamp: number }>,
  onProgress?: (current: number, total: number) => void
): Promise<CVBatchResult> {
  const detections: CVDetectionResult[] = []
  const errors: string[] = []
  let totalConfidence = 0
  let confidenceCount = 0

  // Process frames in parallel batches of 5 to avoid overwhelming the API
  const BATCH_SIZE = 5
  let processedCount = 0

  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE)
    
    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(frame => 
        detectLabels(frame.base64Image, frame.frameNumber, frame.timestamp)
      )
    )
    
    // Collect successful results and track errors
    batchResults.forEach((result, index) => {
      processedCount++
      
      if (result.status === 'fulfilled') {
        detections.push(result.value)
        
        // Calculate average confidence
        result.value.labels.forEach(label => {
          totalConfidence += label.score
          confidenceCount++
        })
      } else {
        const errorMsg = result.reason?.message || 'Unknown error'
        errors.push(errorMsg)
        console.error(`Failed to process frame ${batch[index].frameNumber}:`, result.reason)
      }
      
      // Report progress after each frame completes
      if (onProgress) {
        onProgress(processedCount, frames.length)
      }
    })
  }

  // If all frames failed, throw a descriptive error
  if (detections.length === 0 && frames.length > 0) {
    const firstError = errors[0] || 'Unknown error'
    
    // Check for common error types
    if (firstError.includes('billing')) {
      throw new Error('Google Cloud Vision API requires billing to be enabled. Please enable billing on your project and try again.')
    } else if (firstError.includes('API key') || firstError.includes('UNAUTHENTICATED')) {
      throw new Error('Invalid or missing API key. Please ensure your API key is valid, has Vision API enabled, and billing is active. See console for details.')
    } else if (firstError.includes('quota')) {
      throw new Error('API quota exceeded. Please check your Google Cloud quota limits.')
    } else {
      throw new Error(`Computer vision analysis failed: ${firstError}`)
    }
  }

  return {
    detections,
    totalFrames: frames.length,
    averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
  }
}

/**
 * Filter labels by confidence threshold
 * @param labels - Array of CV labels
 * @param minConfidence - Minimum confidence score (0-1)
 * @returns Filtered labels
 */
export function filterByConfidence(labels: CVLabel[], minConfidence: number = 0.6): CVLabel[] {
  return labels.filter(label => label.score >= minConfidence)
}

/**
 * Check if a specific label exists in detections
 * @param labels - Array of CV labels
 * @param searchTerm - Term to search for (case-insensitive)
 * @param minConfidence - Minimum confidence threshold
 * @returns True if label found with sufficient confidence
 */
export function hasLabel(
  labels: CVLabel[],
  searchTerm: string,
  minConfidence: number = 0.6
): boolean {
  return labels.some(
    label =>
      label.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
      label.score >= minConfidence
  )
}

/**
 * Get the highest confidence score for a label search term
 * @param labels - Array of CV labels
 * @param searchTerm - Term to search for
 * @returns Highest confidence score or 0 if not found
 */
export function getHighestConfidence(labels: CVLabel[], searchTerm: string): number {
  const matchingLabels = labels.filter(label =>
    label.description.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  if (matchingLabels.length === 0) return 0
  
  return Math.max(...matchingLabels.map(label => label.score))
}
