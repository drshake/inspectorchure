/**
 * VLM Response Parser
 * Bridges VLM output to the existing scoring engine
 * Converts FrameAnalysis[] → MappedDetections for scoring-engine.ts
 */

import type { MappedDetections, HygieneCategory } from './detection-mapper'
import type { FrameAnalysis } from './vlm-service'

const CATEGORY_CONFIG: Record<string, { name: string; isPositive: boolean }> = {
  protectiveGloves: { name: 'Protective Gloves', isPositive: true },
  bareHands: { name: 'Bare Hands', isPositive: false },
  hairNet: { name: 'Hair Net', isPositive: true },
  cleanSurface: { name: 'Clean Surface', isPositive: true },
  properApron: { name: 'Proper Apron', isPositive: true },
  handwashStation: { name: 'Handwash Station', isPositive: true },
  pestSigns: { name: 'Pest Signs', isPositive: false },
  crossContamination: { name: 'Cross-Contamination Risk', isPositive: false },
}

/**
 * Parse VLM analysis results into MappedDetections for the scoring engine
 */
export function parseVLMResults(
  analyses: FrameAnalysis[],
  totalFrames: number
): MappedDetections {
  // Track frames with gloves for exclusion logic
  const framesWithGloves = new Set<number>()

  // Accumulate confidence scores per category
  const confidenceAccum: Record<string, { sum: number; count: number }> = {}
  for (const key of Object.keys(CATEGORY_CONFIG)) {
    confidenceAccum[key] = { sum: 0, count: 0 }
  }

  // Build categories
  const categories: Record<string, HygieneCategory> = {}
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    categories[key] = {
      name: config.name,
      keywords: [], // VLM doesn't use keyword matching
      detectedFrames: [],
      totalDetections: 0,
      averageConfidence: 0,
      isPositive: config.isPositive,
    }
  }

  // Process each frame analysis — store actual timestamps (seconds) in detectedFrames
  for (const analysis of analyses) {
    const { timestamp, categories: frameCats } = analysis

    for (const key of Object.keys(CATEGORY_CONFIG)) {
      const cat = frameCats[key as keyof typeof frameCats]
      if (cat && cat.detected) {
        // Track glove timestamps for exclusion logic
        if (key === 'protectiveGloves') {
          framesWithGloves.add(timestamp)
        }

        if (!categories[key].detectedFrames.includes(timestamp)) {
          categories[key].detectedFrames.push(timestamp)
        }
        categories[key].totalDetections++

        confidenceAccum[key].sum += cat.confidence
        confidenceAccum[key].count++
      }
    }
  }

  // Calculate average confidence for each category
  for (const key of Object.keys(CATEGORY_CONFIG)) {
    const accum = confidenceAccum[key]
    categories[key].averageConfidence = accum.count > 0 ? accum.sum / accum.count : 0
  }

  // Apply glove exclusion logic: if gloves detected at a timestamp, exclude that timestamp from bareHands
  categories.bareHands.detectedFrames = categories.bareHands.detectedFrames.filter(
    ts => !framesWithGloves.has(ts)
  )

  console.log('📊 VLM detection mapping results:')
  for (const [key, cat] of Object.entries(categories)) {
    if (cat.detectedFrames.length > 0) {
      console.log(`  ${cat.name}: ${cat.detectedFrames.length} frames (${(cat.averageConfidence * 100).toFixed(1)}% confidence)`)
    }
  }

  return categories as unknown as MappedDetections
}
