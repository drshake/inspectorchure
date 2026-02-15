/**
 * Video Analyzer
 * Orchestrates the complete analysis pipeline:
 * 1. Frame Extraction
 * 2. CV Detection
 * 3. Detection Mapping
 * 4. Scoring
 */

import { extractFrames, getVideoDuration, calculateFrameBrightness, type ExtractionProgress } from './frame-extractor'
import { analyzeFramesBatch, type VLMBatchResult } from './vlm-service'
import { parseVLMResults } from './vlm-response-parser'
import { calculateScores, generateSuggestions, type ScoringResult } from './scoring-engine'
import type { AnalysisResult, Finding } from './types'

export interface AnalysisProgress {
  stage: 'extracting' | 'detecting' | 'scoring'
  progress: number // 0-100
  message: string
}

/**
 * Analyze a video for hygiene compliance
 * @param videoBlob - The recorded video Blob
 * @param estimatedDuration - Estimated video duration in seconds (from recording timer)
 * @param onProgress - Optional progress callback
 * @returns Complete analysis result matching AnalysisResult interface
 */
export async function analyzeVideo(
  videoBlob: Blob,
  estimatedDuration: number,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<AnalysisResult> {
  try {
    // Get actual video duration from metadata (more reliable on mobile)
    onProgress?.({ stage: 'extracting', progress: 0, message: 'Loading video...' })
    
    let actualDuration: number
    try {
      actualDuration = await getVideoDuration(videoBlob)
      console.log(`📹 Video duration: ${actualDuration}s (estimated: ${estimatedDuration}s)`)
    } catch (error) {
      console.warn('Failed to get video duration from metadata:', error)
      // Fall back to estimated duration if metadata loading fails
      actualDuration = estimatedDuration
      console.log(`⚠️ Using estimated duration: ${actualDuration}s`)
    }
    
    // Validate duration
    if (actualDuration < 5) {
      throw new Error('Video too short. Please record at least 5 seconds.')
    }
    
    if (actualDuration > 300) {
      throw new Error('Video too long. Maximum duration is 5 minutes.')
    }
    
    // Stage 1: Extract frames
    onProgress?.({ stage: 'extracting', progress: 5, message: 'Extracting frames from video...' })
    
    const extractionResult = await extractFrames(videoBlob, actualDuration, (extraction: ExtractionProgress) => {
      onProgress?.({
        stage: 'extracting',
        progress: 5 + (extraction.percentComplete * 0.25), // 5-30%
        message: `Extracting frame ${extraction.currentFrame} of ${extraction.totalFrames}...`,
      })
    })

    console.log(`Extracted ${extractionResult.totalFrames} frames`)

    // Validate video brightness using middle frame
    if (extractionResult.frames.length > 0) {
      const middleFrameIndex = Math.floor(extractionResult.frames.length / 2)
      const middleFrame = extractionResult.frames[middleFrameIndex]
      
      try {
        const brightness = await calculateFrameBrightness(middleFrame.base64Image)
        console.log(`Video brightness: ${brightness.toFixed(1)} (threshold: 30)`)
        
        if (brightness < 30) {
          throw new Error('Video too dark for reliable analysis. Please record in a well-lit environment.')
        }
      } catch (error) {
        console.warn('Brightness validation failed:', error)
        // Continue anyway - brightness check is optional
      }
    }

    // Subsample frames: 1 per 3 seconds and cap at 5 frames for speed
    const subsampledFrames = extractionResult.frames
      .filter((_, i) => i % 3 === 0)
      .slice(0, 5)
    console.log(`Subsampled to ${subsampledFrames.length} frames (from ${extractionResult.frames.length})`)

    // Stage 2: VLM Analysis
    onProgress?.({ stage: 'detecting', progress: 30, message: 'Analyzing frames with vision model...' })

    const frames = subsampledFrames.map(frame => ({
      base64Image: frame.base64Image,
      frameNumber: frame.frameNumber,
      timestamp: frame.timestamp,
    }))

    const vlmResults: VLMBatchResult = await analyzeFramesBatch(frames, (current, total) => {
      const detectProgress = 30 + (current / total) * 50 // 30-80%
      onProgress?.({
        stage: 'detecting',
        progress: detectProgress,
        message: `Analyzing frame ${current} of ${total}...`,
      })
    })

    console.log(`VLM analysis complete: ${vlmResults.analyses.length} frames analyzed`)

    // Stage 3: Parse VLM results to hygiene categories
    onProgress?.({ stage: 'scoring', progress: 80, message: 'Calculating hygiene scores...' })

    const mappedDetections = parseVLMResults(vlmResults.analyses, subsampledFrames.length)

    // Stage 4: Calculate scores
    const scoringResult: ScoringResult = calculateScores(mappedDetections, subsampledFrames.length)
    
    onProgress?.({ stage: 'scoring', progress: 95, message: 'Generating report...' })

    // Convert to AnalysisResult format (matching existing interface)
    const analysisResult: AnalysisResult = {
      score: scoringResult.overallScore,
      protectionMeasures: {
        protectiveGloves: getScoreForCategory(scoringResult.individualScores, 'Protective Gloves'),
        properApron: getScoreForCategory(scoringResult.individualScores, 'Proper Apron'),
      },
      hygieneStandards: {
        surfaceCleanliness: getScoreForCategory(scoringResult.individualScores, 'Clean Surfaces'),
        hairCovering: getScoreForCategory(scoringResult.individualScores, 'Hair Covering'),
      },
      handWashing: {
        handwashStation: getScoreForCategory(scoringResult.individualScores, 'Handwash Station'),
      },
      foodHandling: {
        bareHands: getScoreForCategory(scoringResult.individualScores, 'Bare Hands'),
        crossContamination: getScoreForCategory(scoringResult.individualScores, 'Cross Contamination'),
      },
      bacterialRisk: 100 - scoringResult.overallScore, // Inverse of overall score
      keyFindings: convertFindings(scoringResult.findings),
      improvements: generateSuggestions(scoringResult.findings, scoringResult.individualScores),
      analyzedAt: new Date().toISOString(),
      detectionMetadata: {
        glovesDetected: mappedDetections.protectiveGloves.detectedFrames.length > 0,
        bareHandsDetected: mappedDetections.bareHands.detectedFrames.length > 0,
        hairNetDetected: mappedDetections.hairNet.detectedFrames.length > 0,
        surfaceDetected: mappedDetections.cleanSurface.detectedFrames.length > 0,
        apronDetected: mappedDetections.properApron.detectedFrames.length > 0,
        handwashDetected: mappedDetections.handwashStation.detectedFrames.length > 0,
        pestDetected: mappedDetections.pestSigns.detectedFrames.length > 0,
      },
    }

    onProgress?.({ stage: 'scoring', progress: 100, message: 'Analysis complete!' })

    return analysisResult
  } catch (error) {
    console.error('[v0] Video analysis failed:', error)
    // Preserve the original error message without double-wrapping
    if (error instanceof Error) {
      if (error.message.startsWith('Analysis failed:')) {
        throw error
      }
      throw new Error(`Analysis failed: ${error.message}`)
    }
    throw new Error('Analysis failed: Unknown error')
  }
}

/**
 * Get score for a specific category by name
 */
function getScoreForCategory(scores: any[], categoryName: string): number {
  const score = scores.find(s => s.category === categoryName)
  return score ? Math.round(score.score) : 0 // Default to 0 if not detected
}

/**
 * Convert scoring engine findings to AnalysisResult Finding format
 * Preserves all severity levels: critical, major, minor
 */
function convertFindings(findings: any[]): Finding[] {
  return findings.map(finding => {
    let type: 'critical' | 'moderate'

    if (finding.severity === 'critical') {
      type = 'critical'
    } else {
      type = 'moderate'
    }

    // timestamp 0 means "not detected at a specific moment" (e.g. gloves missing throughout)
    const secs = Math.round(finding.timestamp)
    const timestamp = secs > 0
      ? `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`
      : 'Throughout'

    return {
      type,
      message: finding.description,
      timestamp,
    }
  })
}
