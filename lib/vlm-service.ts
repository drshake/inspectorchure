/**
 * VLM (Vision Language Model) Service
 * Replaces cv-service.ts in the analysis pipeline
 * Calls the /api/vision/analyze endpoint for Qwen3-VL inference
 */

export interface VLMCategory {
  detected: boolean
  confidence: number
  details: string
}

export interface FrameAnalysis {
  frameNumber: number
  timestamp: number
  categories: {
    protectiveGloves: VLMCategory
    bareHands: VLMCategory
    hairNet: VLMCategory
    cleanSurface: VLMCategory
    properApron: VLMCategory
    handwashStation: VLMCategory
    pestSigns: VLMCategory
    crossContamination: VLMCategory
  }
}

export interface VLMBatchResult {
  analyses: FrameAnalysis[]
  totalFrames: number
}

/**
 * Analyze a single frame via the VLM API endpoint
 */
export async function analyzeFrame(
  base64Image: string,
  frameNumber: number,
  timestamp: number
): Promise<FrameAnalysis> {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')

  const response = await fetch('/api/vision/analyze', {
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
    let errorBody: any = {}
    try {
      errorBody = await response.json()
    } catch {
      errorBody = { message: `HTTP ${response.status}` }
    }
    const msg = errorBody.message || errorBody.error || `VLM API returned ${response.status}`
    console.error(`[VLM] Analysis failed for frame ${frameNumber}: ${msg}`, errorBody)
    throw new Error(msg)
  }

  return await response.json()
}

/**
 * Process all frames fully in parallel — no batching, no delays.
 * All API calls fire simultaneously for maximum speed.
 */
export async function analyzeFramesBatch(
  frames: Array<{ base64Image: string; frameNumber: number; timestamp: number }>,
  onProgress?: (current: number, total: number) => void
): Promise<VLMBatchResult> {
  const errors: string[] = []

  onProgress?.(0, frames.length)

  const results = await Promise.allSettled(
    frames.map(frame =>
      analyzeFrame(frame.base64Image, frame.frameNumber, frame.timestamp)
    )
  )

  const analyses: FrameAnalysis[] = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      analyses.push(result.value)
    } else {
      const errorMsg = result.reason?.message || 'Unknown error'
      errors.push(errorMsg)
      console.error(`[VLM] Failed to analyze frame ${frames[index].frameNumber}:`, result.reason)
    }
  })

  onProgress?.(frames.length, frames.length)

  // If all frames failed, throw a descriptive error
  if (analyses.length === 0 && frames.length > 0) {
    const firstError = errors[0] || 'Unknown error'

    if (firstError.includes('API not configured') || firstError.includes('HUGGINGFACE_API_TOKEN')) {
      throw new Error('Hugging Face API token not configured. Please set HUGGINGFACE_API_TOKEN in your environment variables.')
    } else if (firstError.includes('rate') || firstError.includes('429')) {
      throw new Error('VLM API rate limit exceeded. Please try again in a few moments.')
    } else {
      throw new Error(`VLM analysis failed: ${firstError}`)
    }
  }

  return {
    analyses,
    totalFrames: frames.length,
  }
}
