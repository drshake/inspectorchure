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

  // Add suggestions based on critical and major findings
  findings.forEach((finding) => {
    if (!categories.has(finding.category)) {
      categories.add(finding.category)
      
      if (finding.category === 'Protective Gloves') {
        if (finding.severity === 'critical') {
          suggestions.push('Wear gloves consistently throughout food preparation. Keep them within easy reach so you remember to use them.')
        } else {
          suggestions.push('Maintain glove usage more consistently - they should be on whenever you\'re handling food.')
        }
      } else if (finding.category === 'Hand Hygiene') {
        if (finding.severity === 'critical') {
          suggestions.push('Avoid touching food with bare hands. Always use gloves or utensils when handling ready-to-eat items.')
        } else {
          suggestions.push('Wash your hands thoroughly before and after handling different types of food.')
        }
      } else if (finding.category === 'Hair Covering') {
        if (finding.severity === 'critical') {
          suggestions.push('Wear a hair net or hat before you start cooking - it should cover all your hair completely.')
        } else {
          suggestions.push('Make sure your hair covering is secure and covers all your hair during food prep.')
        }
      }
    }
  })

  // Add suggestions for low-scoring categories (even without findings)
  scores.forEach((score) => {
    if (score.score < 70 && !categories.has(score.category)) {
      categories.add(score.category)
      
      if (score.category.includes('Glove')) {
        suggestions.push('Your glove usage was inconsistent in this video. Try putting them on at the start and keeping them on throughout.')
      } else if (score.category.includes('Hygiene')) {
        suggestions.push('Your hand hygiene needs attention. Make handwashing a habit at every stage of food preparation.')
      } else if (score.category.includes('Hair')) {
        suggestions.push('Hair covering wasn\'t consistently worn. Make it your first step before starting any food prep.')
      } else if (score.category.includes('Surface')) {
        suggestions.push('Clean and sanitize your work surfaces more frequently, especially when switching between different foods.')
      } else if (score.category.includes('Equipment')) {
        suggestions.push('Use proper food-grade equipment and sanitize cutting boards between uses.')
      } else if (score.category.includes('Contamination')) {
        suggestions.push('Be mindful of cross-contamination - use separate areas and tools when handling different food types.')
      }
    }
  })

  // Add encouraging message if doing well
  if (suggestions.length === 0) {
    suggestions.push('Excellent work! You\'re following proper food safety protocols. Keep up these great habits ✨')
    suggestions.push('Consider doing regular video self-checks to maintain this high standard consistently')
  }

  return suggestions
}
