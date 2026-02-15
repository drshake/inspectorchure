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
 *
 * POSITIVES (earn points):
 *   protectiveGloves  0.12
 *   cleanSurface      0.12
 *   hairNet           0.10
 *   properApron       0.10
 *   handwashStation   0.16
 *
 * VIOLATIONS (lose points):
 *   bareHands         0.20
 *   pestSigns         0.15
 *   crossContamination 0.05
 */
const CATEGORY_WEIGHTS = {
  protectiveGloves: 0.12,
  cleanSurface: 0.12,
  hairNet: 0.10,
  properApron: 0.10,
  handwashStation: 0.16,
  bareHands: 0.20,
  pestSigns: 0.15,
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

  // --- POSITIVES (higher detection rate = higher score) ---

  // Protective Gloves (12%)
  const glovesFrequency = calculateFrequency(detections.protectiveGloves, totalFrames)
  const glovesScore = Math.min(100, (glovesFrequency / 80) * 100) // 80% presence = 100
  individualScores.push({
    category: 'Protective Gloves',
    score: glovesScore,
    weight: CATEGORY_WEIGHTS.protectiveGloves,
    detectionRate: glovesFrequency,
    confidence: detections.protectiveGloves.averageConfidence,
  })
  if (glovesFrequency < 60) {
    findings.push({
      category: 'Protective Gloves',
      severity: 'critical',
      description: 'Protective gloves not consistently worn during food preparation',
      timestamp: detections.protectiveGloves.detectedFrames[0] || 0,
      frameNumber: detections.protectiveGloves.detectedFrames[0] || 1,
      confidence: detections.protectiveGloves.averageConfidence || 0.85,
    })
  }

  // Clean Surface (12%)
  const surfaceFrequency = calculateFrequency(detections.cleanSurface, totalFrames)
  const surfaceScore = Math.min(100, (surfaceFrequency / 60) * 100) // 60% presence = 100
  individualScores.push({
    category: 'Clean Surfaces',
    score: surfaceScore,
    weight: CATEGORY_WEIGHTS.cleanSurface,
    detectionRate: surfaceFrequency,
    confidence: detections.cleanSurface.averageConfidence,
  })
  if (surfaceFrequency < 40) {
    findings.push({
      category: 'Clean Surfaces',
      severity: 'major',
      description: 'Work surfaces not consistently clean — visible debris, grease, or stains',
      timestamp: detections.cleanSurface.detectedFrames[0] || 0,
      frameNumber: detections.cleanSurface.detectedFrames[0] || 1,
      confidence: detections.cleanSurface.averageConfidence || 0.7,
    })
  }

  // Hair Net (10%)
  const hairNetFrequency = calculateFrequency(detections.hairNet, totalFrames)
  const hairNetScore = Math.min(100, (hairNetFrequency / 70) * 100) // 70% presence = 100
  individualScores.push({
    category: 'Hair Covering',
    score: hairNetScore,
    weight: CATEGORY_WEIGHTS.hairNet,
    detectionRate: hairNetFrequency,
    confidence: detections.hairNet.averageConfidence,
  })
  if (hairNetFrequency < 50) {
    findings.push({
      category: 'Hair Covering',
      severity: 'major',
      description: 'Hair covering not detected or worn improperly',
      timestamp: detections.hairNet.detectedFrames[0] || 0,
      frameNumber: detections.hairNet.detectedFrames[0] || 1,
      confidence: detections.hairNet.averageConfidence || 0.75,
    })
  }

  // Proper Apron (10%)
  const apronFrequency = calculateFrequency(detections.properApron, totalFrames)
  const apronScore = Math.min(100, (apronFrequency / 70) * 100) // 70% presence = 100
  individualScores.push({
    category: 'Proper Apron',
    score: apronScore,
    weight: CATEGORY_WEIGHTS.properApron,
    detectionRate: apronFrequency,
    confidence: detections.properApron.averageConfidence,
  })
  if (apronFrequency < 50) {
    findings.push({
      category: 'Proper Apron',
      severity: 'major',
      description: 'Clean apron or chef coat not worn during food preparation',
      timestamp: detections.properApron.detectedFrames[0] || 0,
      frameNumber: detections.properApron.detectedFrames[0] || 1,
      confidence: detections.properApron.averageConfidence || 0.7,
    })
  }

  // Handwash Station (16%)
  const handwashFrequency = calculateFrequency(detections.handwashStation, totalFrames)
  const handwashScore = Math.min(100, (handwashFrequency / 30) * 100) // 30% presence = 100 (just needs to be visible)
  individualScores.push({
    category: 'Handwash Station',
    score: handwashScore,
    weight: CATEGORY_WEIGHTS.handwashStation,
    detectionRate: handwashFrequency,
    confidence: detections.handwashStation.averageConfidence,
  })
  if (handwashFrequency < 10) {
    findings.push({
      category: 'Handwash Station',
      severity: 'critical',
      description: 'No handwashing station with soap and paper towels visible in the preparation area',
      timestamp: detections.handwashStation.detectedFrames[0] || 0,
      frameNumber: detections.handwashStation.detectedFrames[0] || 1,
      confidence: detections.handwashStation.averageConfidence || 0.8,
    })
  }

  // --- VIOLATIONS (higher detection rate = lower score) ---

  // Bare Hands (20%)
  const bareHandsFrequency = calculateFrequency(detections.bareHands, totalFrames)
  const bareHandsScore = Math.max(10, 100 - (bareHandsFrequency / 30) * 100) // 30% presence = 0, min 10
  individualScores.push({
    category: 'Bare Hands',
    score: bareHandsScore,
    weight: CATEGORY_WEIGHTS.bareHands,
    detectionRate: bareHandsFrequency,
    confidence: detections.bareHands.averageConfidence,
  })
  if (bareHandsFrequency > 20) {
    findings.push({
      category: 'Bare Hands',
      severity: 'critical',
      description: 'Bare hands detected in contact with food or food-contact surfaces',
      timestamp: detections.bareHands.detectedFrames[0] || 0,
      frameNumber: detections.bareHands.detectedFrames[0] || 1,
      confidence: detections.bareHands.averageConfidence,
    })
  }

  // Pest Signs (15%)
  const pestFrequency = calculateFrequency(detections.pestSigns, totalFrames)
  const pestScore = Math.max(0, 100 - (pestFrequency / 10) * 100) // 10% presence = 0 (any pest sign is very bad)
  individualScores.push({
    category: 'Pest Control',
    score: pestScore,
    weight: CATEGORY_WEIGHTS.pestSigns,
    detectionRate: pestFrequency,
    confidence: detections.pestSigns.averageConfidence,
  })
  if (pestFrequency > 0) {
    findings.push({
      category: 'Pest Control',
      severity: 'critical',
      description: 'Signs of pest activity detected — droppings, insects, or infestation evidence',
      timestamp: detections.pestSigns.detectedFrames[0] || 0,
      frameNumber: detections.pestSigns.detectedFrames[0] || 1,
      confidence: detections.pestSigns.averageConfidence,
    })
  }

  // Cross-Contamination (5%)
  const crossContamFrequency = calculateFrequency(detections.crossContamination, totalFrames)
  const crossContamScore = Math.max(10, 100 - (crossContamFrequency / 20) * 100) // 20% presence = 0, min 10
  individualScores.push({
    category: 'Cross Contamination',
    score: crossContamScore,
    weight: CATEGORY_WEIGHTS.crossContamination,
    detectionRate: crossContamFrequency,
    confidence: detections.crossContamination.averageConfidence,
  })
  if (crossContamFrequency > 10) {
    findings.push({
      category: 'Cross Contamination',
      severity: 'critical',
      description: 'Raw meat/poultry/fish in direct contact with ready-to-eat foods',
      timestamp: detections.crossContamination.detectedFrames[0] || 0,
      frameNumber: detections.crossContamination.detectedFrames[0] || 1,
      confidence: detections.crossContamination.averageConfidence,
    })
  }

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
  const summary = generateSummary(overallScore, findings, individualScores)

  return {
    overallScore: Math.round(overallScore),
    individualScores,
    findings,
    summary,
  }
}

/**
 * Generate human-readable summary based on actual detections
 */
function generateSummary(score: number, findings: Finding[], scores: HygieneScore[]): string {
  const criticalFindings = findings.filter(f => f.severity === 'critical')
  const majorFindings = findings.filter(f => f.severity === 'major')
  
  // Get specific problem areas
  const lowScores = scores.filter(s => s.score < 70)
  const highScores = scores.filter(s => s.score >= 85)
  
  if (score >= 90) {
    if (highScores.length > 0) {
      const strengths = highScores.map(s => s.category.toLowerCase()).slice(0, 2).join(' and ')
      return `Outstanding work! Your ${strengths} practices are exemplary. Keep maintaining these high standards.`
    }
    return 'Excellent hygiene practices observed throughout your food preparation. You\'re setting a great example!'
  } else if (score >= 80) {
    if (lowScores.length > 0) {
      const areas = lowScores.map(s => s.category.toLowerCase()).slice(0, 2).join(' and ')
      return `Good overall performance! Focus on improving your ${areas} to achieve excellence.`
    }
    return 'Solid hygiene practices with just a few minor areas to refine. You\'re doing well overall.'
  } else if (score >= 70) {
    if (criticalFindings.length > 0) {
      const issues = criticalFindings.map(f => f.category.toLowerCase()).slice(0, 2).join(' and ')
      return `Your ${issues} need immediate attention. Address these critical areas to meet safety standards.`
    }
    return 'Acceptable baseline hygiene, but several practices need improvement to ensure consistent food safety.'
  } else if (score >= 60) {
    const problemAreas = lowScores.map(s => s.category.toLowerCase()).slice(0, 3)
    const areasList = problemAreas.length > 1 
      ? problemAreas.slice(0, -1).join(', ') + ' and ' + problemAreas[problemAreas.length - 1]
      : problemAreas[0]
    return `Your ${areasList} practices are below standard. Immediate corrective action is needed to ensure customer safety.`
  } else {
    return `Critical hygiene violations detected across multiple areas. A comprehensive review of your food safety protocols and immediate staff training is required.`
  }
}

/**
 * Generate personalized improvement suggestions based on findings
 */
export function generateSuggestions(findings: Finding[], scores: HygieneScore[]): string[] {
  const suggestions: string[] = []
  const categories = new Set<string>()

  const SUGGESTION_MAP: Record<string, string> = {
    'Protective Gloves': 'Wear food-safe gloves consistently while handling food',
    'Bare Hands': 'Use gloves or utensils — avoid bare-hand contact with food',
    'Hair Covering': 'Wear a hair net or hat that fully restrains hair',
    'Clean Surfaces': 'Clean and sanitize work surfaces between tasks',
    'Proper Apron': 'Wear a clean apron or chef coat during prep',
    'Handwash Station': 'Keep a handwash sink with soap and towels accessible',
    'Pest Control': 'Address pest signs immediately — clean and seal entry points',
    'Cross Contamination': 'Separate raw meat from ready-to-eat foods',
  }

  // Add suggestions from findings
  findings.forEach((finding) => {
    if (!categories.has(finding.category) && SUGGESTION_MAP[finding.category]) {
      categories.add(finding.category)
      suggestions.push(SUGGESTION_MAP[finding.category])
    }
  })

  // Add suggestions for low-scoring categories without findings
  scores.forEach((score) => {
    if (score.score < 70 && !categories.has(score.category) && SUGGESTION_MAP[score.category]) {
      categories.add(score.category)
      suggestions.push(SUGGESTION_MAP[score.category])
    }
  })

  if (suggestions.length === 0) {
    suggestions.push('Great job — keep maintaining these food safety standards')
  }

  return suggestions
}
