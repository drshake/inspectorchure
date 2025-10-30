/**
 * Type Definitions for Food Safety Analysis
 * Used across the application for consistent data structures
 */

export interface Finding {
  type: "critical" | "moderate"
  message: string
  timestamp: string
}

export interface AnalysisResult {
  score: number
  protectionMeasures: {
    protectiveGloves: number
    safetyEquipment: number
  }
  hygieneStandards: {
    surfaceCleanliness: number
  }
  foodHandling: {
    cuttingBoardUsage: number
    rawFoodSafety: number
  }
  bacterialRisk: number
  keyFindings: Finding[]
  improvements: string[]
  analyzedAt: string
  detectionMetadata?: {
    glovesDetected: boolean
    bareHandsDetected: boolean
    hairNetDetected: boolean
    surfaceDetected: boolean
    equipmentDetected: boolean
    foodDetected: boolean
  }
}
