/**
 * Detection Mapper
 * Maps CV labels to hygiene categories and calculates scores
 */

import { CVLabel, CVDetectionResult } from './cv-service'

export interface HygieneCategory {
  name: string
  keywords: string[] // CV labels that indicate this category
  detectedFrames: number[]
  totalDetections: number
  averageConfidence: number
  isPositive: boolean // true = good practice, false = violation
}

export interface MappedDetections {
  protectiveGloves: HygieneCategory
  bareHands: HygieneCategory
  hairNet: HygieneCategory
  cleanSurface: HygieneCategory
  properApron: HygieneCategory
  handwashStation: HygieneCategory
  pestSigns: HygieneCategory
  crossContamination: HygieneCategory
}

/**
 * Hygiene keyword mappings for CV label detection
 * Updated based on actual Google Vision API responses
 */
const HYGIENE_KEYWORDS = {
  protectiveGloves: ['glove', 'disposable glove', 'medical glove', 'latex glove', 'nitrile glove', 'rubber glove', 'protective glove'],
  bareHands: ['hand', 'finger', 'thumb', 'wrist', 'palm', 'fist', 'nail', 'flesh'],
  hairNet: ['hair net', 'hairnet', 'chef hat', 'chef\'s hat', 'head covering', 'haircover', 'cap', 'beanie', 'bandana'],
  cleanSurface: ['table', 'counter', 'countertop', 'stainless steel', 'work surface', 'tabletop', 'desk', 'bench'],
  properApron: ['apron', 'chef coat', 'chef jacket', 'kitchen coat'],
  handwashStation: ['sink', 'handwash', 'soap', 'paper towel', 'hand washing'],
  pestSigns: ['rodent', 'droppings', 'cockroach', 'fly', 'ant', 'pest', 'insect'],
  crossContamination: ['raw meat', 'raw chicken', 'raw fish', 'contamination'],
}

/**
 * Map CV detections to hygiene categories
 * @param detections - Array of CV detection results from all frames
 * @returns Mapped hygiene categories with detection counts
 */
export function mapDetections(detections: CVDetectionResult[]): MappedDetections {
  const categories: MappedDetections = {
    protectiveGloves: createEmptyCategory('Protective Gloves', HYGIENE_KEYWORDS.protectiveGloves, true),
    bareHands: createEmptyCategory('Bare Hands', HYGIENE_KEYWORDS.bareHands, false),
    hairNet: createEmptyCategory('Hair Net', HYGIENE_KEYWORDS.hairNet, true),
    cleanSurface: createEmptyCategory('Clean Surface', HYGIENE_KEYWORDS.cleanSurface, true),
    properApron: createEmptyCategory('Proper Apron', HYGIENE_KEYWORDS.properApron, true),
    handwashStation: createEmptyCategory('Handwash Station', HYGIENE_KEYWORDS.handwashStation, true),
    pestSigns: createEmptyCategory('Pest Signs', HYGIENE_KEYWORDS.pestSigns, false),
    crossContamination: createEmptyCategory('Cross-Contamination Risk', HYGIENE_KEYWORDS.crossContamination, false),
  }

  // Track frames with gloves for exclusion logic
  const framesWithGloves = new Set<number>()

  console.log(`🔍 Mapping ${detections.length} frames to hygiene categories...`)

  // Process each frame's detections
  detections.forEach((detection) => {
    const { labels, frameNumber } = detection

    // Log first few frames for debugging
    if (frameNumber <= 3) {
      console.log(`Frame ${frameNumber} labels:`, labels.map(l => l.description).join(', '))
    }

    // Check each category
    Object.keys(categories).forEach((categoryKey) => {
      const category = categories[categoryKey as keyof MappedDetections]
      
      // Check if any keyword matches the labels
      const matchingLabels = findMatchingLabels(labels, category.keywords)
      
      if (matchingLabels.length > 0) {
        // Track glove detections for exclusion logic
        if (categoryKey === 'protectiveGloves') {
          framesWithGloves.add(frameNumber)
        }
        
        // Use Set to prevent duplicate frame counting
        if (!category.detectedFrames.includes(frameNumber)) {
          category.detectedFrames.push(frameNumber)
        }
        
        category.totalDetections += matchingLabels.length
        
        // Update average confidence
        const totalConfidence = matchingLabels.reduce((sum, label) => sum + label.score, 0)
        const avgNewConfidence = totalConfidence / matchingLabels.length
        
        // Weighted average with existing confidence
        if (category.averageConfidence === 0) {
          category.averageConfidence = avgNewConfidence
        } else {
          const currentCount = category.detectedFrames.length - 1
          category.averageConfidence = 
            (category.averageConfidence * currentCount + avgNewConfidence) / category.detectedFrames.length
        }
      }
    })
  })

  // Log mapping results
  console.log('📊 Detection mapping results:')
  Object.entries(categories).forEach(([key, cat]) => {
    if (cat.detectedFrames.length > 0) {
      console.log(`  ${cat.name}: ${cat.detectedFrames.length} frames (${(cat.averageConfidence * 100).toFixed(1)}% confidence)`)
    }
  })

  // Apply exclusion logic: Remove bareHands detections from frames with gloves
  categories.bareHands.detectedFrames = categories.bareHands.detectedFrames.filter(
    frameNumber => !framesWithGloves.has(frameNumber)
  )

  return categories
}

/**
 * Find CV labels that match category keywords
 */
function findMatchingLabels(labels: CVLabel[], keywords: string[]): CVLabel[] {
  return labels.filter(label => 
    keywords.some(keyword => 
      label.description.toLowerCase().includes(keyword.toLowerCase())
    ) && label.score >= 0.5 // Minimum confidence threshold
  )
}

/**
 * Create an empty hygiene category
 */
function createEmptyCategory(
  name: string,
  keywords: string[],
  isPositive: boolean
): HygieneCategory {
  return {
    name,
    keywords,
    detectedFrames: [],
    totalDetections: 0,
    averageConfidence: 0,
    isPositive,
  }
}

/**
 * Calculate detection frequency (what % of frames had this detection)
 */
export function calculateFrequency(
  category: HygieneCategory,
  totalFrames: number
): number {
  return (category.detectedFrames.length / totalFrames) * 100
}
