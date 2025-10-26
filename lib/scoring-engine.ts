/**
 * Scoring Engine
 * Converts CV detections into hygiene scores and findings
 */

import { MappedDetections, calculateFrequency, HygieneCategory } from './detection-mapper'

export interface HygieneScore {
  category: string
  score: number // 0-100
  weight: number // importance weight
  detectionRate: number // % of frames with detection
  confidence: number // average CV confidence
}

export interface Finding {
  category: string
  severity: 'critical' | 'major' | 'minor'
  description: string
  timestamp: number // when first detected
  frameNumber: number
  confidence: number
}

export interface ScoringResult {
  overallScore: number // 0-100
  individualScores: HygieneScore[]
  findings: Finding[]
  summary: string
}

/**
 * Category weights (must sum to 1.0)
 */
const CATEGORY_WEIGHTS = {
  protectiveGloves: 0.30, // Most important
  bareHands: 0.25, // Critical violation
  hairNet: 0.15,
  cleanSurface: 0.15,
  equipment: 0.10,
  crossContamination: 0.05,
}

/**
 * Calculate hygiene scores from mapped detections
 * @param detections - Mapped hygiene categories
 * @param totalFrames - Total number of analyzed frames
 * @returns Scoring result with overall score and findings
 */
export function calculateScores(
  detections: MappedDetections,
  totalFrames: number
): ScoringResult {
  const individualScores: HygieneScore[] = []
  const findings: Finding[] = []

  // Calculate Protective Gloves score
  const glovesFrequency = calculateFrequency(detections.protectiveGloves, totalFrames)
  const glovesScore = Math.min(100, (glovesFrequency / 80) * 100) // 80% presence = 100 score
  individualScores.push({
    category: 'Protective Gloves',
    score: glovesScore,
    weight: CATEGORY_WEIGHTS.protectiveGloves,
    detectionRate: glovesFrequency,
    confidence: detections.protectiveGloves.averageConfidence,
  })

  if (glovesFrequency < 60) {
    const firstDetection = detections.protectiveGloves.detectedFrames[0]
    findings.push({
      category: 'Protective Gloves',
      severity: 'critical',
      description: 'Protective gloves not consistently worn during food preparation',
      timestamp: firstDetection || 0,
      frameNumber: firstDetection || 1,
      confidence: detections.protectiveGloves.averageConfidence || 0.85,
    })
  }

  // Calculate Bare Hands score (inverse - fewer detections = better)
  const bareHandsFrequency = calculateFrequency(detections.bareHands, totalFrames)
  const bareHandsScore = Math.max(10, 100 - (bareHandsFrequency / 30) * 100) // 30% presence = 0 score, min 10
  individualScores.push({
    category: 'Hand Hygiene',
    score: bareHandsScore,
    weight: CATEGORY_WEIGHTS.bareHands,
    detectionRate: bareHandsFrequency,
    confidence: detections.bareHands.averageConfidence,
  })

  if (bareHandsFrequency > 20) {
    const firstDetection = detections.bareHands.detectedFrames[0]
    findings.push({
      category: 'Hand Hygiene',
      severity: 'critical',
      description: 'Bare hands detected in contact with food',
      timestamp: firstDetection || 0,
      frameNumber: firstDetection || 1,
      confidence: detections.bareHands.averageConfidence,
    })
  }

  // Calculate Hair Net score
  const hairNetFrequency = calculateFrequency(detections.hairNet, totalFrames)
  const hairNetScore = Math.min(100, (hairNetFrequency / 70) * 100) // 70% presence = 100 score
  individualScores.push({
    category: 'Hair Covering',
    score: hairNetScore,
    weight: CATEGORY_WEIGHTS.hairNet,
    detectionRate: hairNetFrequency,
    confidence: detections.hairNet.averageConfidence,
  })

  if (hairNetFrequency < 50) {
    const firstDetection = detections.hairNet.detectedFrames[0]
    findings.push({
      category: 'Hair Covering',
      severity: 'major',
      description: 'Hair covering not detected or worn improperly',
      timestamp: firstDetection || 0,
      frameNumber: firstDetection || 1,
      confidence: detections.hairNet.averageConfidence || 0.75,
    })
  }

  // Calculate Clean Surface score (based on detection and confidence)
  const surfaceFrequency = calculateFrequency(detections.cleanSurface, totalFrames)
  const surfaceScore = Math.min(100, (surfaceFrequency / 60) * 100) // 60% presence = 100 score
  individualScores.push({
    category: 'Surface Cleanliness',
    score: surfaceScore,
    weight: CATEGORY_WEIGHTS.cleanSurface,
    detectionRate: surfaceFrequency,
    confidence: detections.cleanSurface.averageConfidence,
  })

  // Calculate Equipment score
  const equipmentFrequency = calculateFrequency(detections.equipment, totalFrames)
  const equipmentScore = Math.min(100, (equipmentFrequency / 70) * 100) // 70% presence = 100 score
  individualScores.push({
    category: 'Equipment Usage',
    score: equipmentScore,
    weight: CATEGORY_WEIGHTS.equipment,
    detectionRate: equipmentFrequency,
    confidence: detections.equipment.averageConfidence,
  })

  // Calculate Cross-Contamination risk (fewer detections = better)
  const crossContamFrequency = calculateFrequency(detections.crossContamination, totalFrames)
  const crossContamScore = Math.max(10, 100 - (crossContamFrequency / 40) * 100) // 40% presence = 0 score, min 10
  individualScores.push({
    category: 'Cross-Contamination Prevention',
    score: crossContamScore,
    weight: CATEGORY_WEIGHTS.crossContamination,
    detectionRate: crossContamFrequency,
    confidence: detections.crossContamination.averageConfidence,
  })

  // Calculate weighted overall score
  const overallScore = individualScores.reduce((sum, score) => {
    return sum + (score.score * score.weight)
  }, 0)

  // Log scoring breakdown for debugging
  console.log('📊 Scoring breakdown:')
  individualScores.forEach(score => {
    const contribution = (score.score * score.weight).toFixed(1)
    console.log(`  ${score.category}: ${score.score.toFixed(1)}% (weight: ${(score.weight * 100).toFixed(0)}%) → +${contribution} points`)
  })
  console.log(`  ═══════════════════════════════`)
  console.log(`  Overall Score: ${Math.round(overallScore)}%`)

  // Generate summary
  const summary = generateSummary(overallScore, findings.length)

  return {
    overallScore: Math.round(overallScore),
    individualScores,
    findings,
    summary,
  }
}

/**
 * Generate human-readable summary
 */
function generateSummary(score: number, findingsCount: number): string {
  if (score >= 90) {
    return 'Excellent hygiene practices observed throughout the video.'
  } else if (score >= 80) {
    return 'Good hygiene practices with minor areas for improvement.'
  } else if (score >= 70) {
    return 'Acceptable hygiene with several violations requiring attention.'
  } else if (score >= 60) {
    return 'Below standard hygiene practices detected. Immediate corrective action recommended.'
  } else {
    return 'Critical hygiene violations detected. Comprehensive training and protocol review required.'
  }
}

/**
 * Generate improvement suggestions based on findings
 */
export function generateSuggestions(findings: Finding[]): string[] {
  const suggestions: string[] = []

  findings.forEach((finding) => {
    if (finding.category === 'Protective Gloves') {
      suggestions.push('Ensure all food handlers wear disposable gloves when handling ready-to-eat foods')
    } else if (finding.category === 'Hand Hygiene') {
      suggestions.push('Implement strict hand-washing protocols and eliminate direct hand contact with food')
    } else if (finding.category === 'Hair Covering') {
      suggestions.push('Require all staff to wear proper hair nets or chef hats during food preparation')
    }
  })

  // Remove duplicates
  return [...new Set(suggestions)]
}
