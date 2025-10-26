export type Finding = {
  type: "critical" | "moderate"
  message: string
  timestamp: string // Timestamp in format MM:SS
}

export type AnalysisResult = {
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
  analyzedAt: string // Date and time of analysis
  detectionMetadata?: {
    // Track what was actually detected to distinguish 0% from "Not Assessed"
    glovesDetected: boolean
    bareHandsDetected: boolean
    hairNetDetected: boolean
    surfaceDetected: boolean
    equipmentDetected: boolean
    foodDetected: boolean
  }
}

const possibleFindings = {
  critical: [
    "Protective Gloves compliance below required threshold",
    "Utensil Hygiene compliance critically low",
    "Cross-contamination risk detected",
    "Improper food storage temperature",
    "Raw food handling violations",
    "Missing critical safety equipment",
    "Unsafe chemical storage near food",
  ],
  moderate: [
    "Food Preparation Sequence needs improvement",
    "Workspace organization below standard",
    "Equipment cleaning frequency insufficient",
    "Temperature monitoring inconsistent",
    "Hand washing station accessibility limited",
    "Food labeling system incomplete",
    "Storage area organization needs attention",
  ],
}

const possibleImprovements = [
  "Ensure consistent use of clean gloves during food handling",
  "Clean and sanitize utensils thoroughly between uses",
  "Implement proper food storage temperature monitoring",
  "Maintain separate cutting boards for different food types",
  "Establish regular cleaning schedule for all equipment",
  "Organize storage areas to prevent cross-contamination",
  "Install additional hand washing stations in key areas",
  "Provide staff training on proper food handling procedures",
  "Implement a clear labeling system for stored foods",
  "Regular maintenance of safety equipment",
]

// Generate a random number within a range
const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// Generate a random percentage with more weight towards certain ranges
const generateWeightedPercentage = (risk: "high" | "medium" | "low"): number => {
  switch (risk) {
    case "high":
      return randomInRange(30, 60) // Lower scores (below 61%)
    case "medium":
      return randomInRange(61, 85) // Middle range scores
    case "low":
      return randomInRange(86, 99) // Higher scores
  }
}

// Extract video duration from filename or estimate based on file size
const extractVideoDuration = (fileName: string): number => {
  // Try to extract duration from filename if it contains a pattern like "10s" or "10sec"
  const durationMatch = fileName.match(/(\d+)s(?:ec)?/i)
  if (durationMatch && durationMatch[1]) {
    return Math.max(1, Number.parseInt(durationMatch[1], 10))
  }

  // If no duration in filename, make a conservative estimate
  // For demo purposes, assume short videos (5-15 seconds)
  return randomInRange(5, 15)
}

// Generate timestamps that are properly distributed within the video duration
const generateTimestamps = (count: number, duration: number): string[] => {
  if (duration <= 0) duration = 10 // Fallback to 10 seconds if duration is invalid

  // Create segments to distribute timestamps throughout the video
  const segmentSize = duration / (count + 1)
  const timestamps: string[] = []

  for (let i = 0; i < count; i++) {
    // Place timestamp in its segment with some randomness
    // This ensures timestamps are distributed throughout the video
    const segmentStart = Math.round(segmentSize * (i + 0.2))
    const segmentEnd = Math.round(segmentSize * (i + 0.8))

    // Ensure we don't exceed video duration
    const second = Math.min(randomInRange(segmentStart, segmentEnd), duration - 1)

    // Format as MM:SS
    const minutes = Math.floor(second / 60)
    const seconds = second % 60
    timestamps.push(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`)
  }

  return timestamps
}

export const generateAnalysis = (fileName: string): AnalysisResult => {
  // Use filename to generate a seed for consistent results per file
  const seed = Array.from(fileName).reduce((acc, char) => acc + char.charCodeAt(0), 0)

  // Determine overall risk level based on seed
  const riskLevel: "high" | "medium" | "low" = seed % 3 === 0 ? "high" : seed % 2 === 0 ? "medium" : "low"

  // Generate base scores
  const protectiveGloves = generateWeightedPercentage(riskLevel)
  const safetyEquipment = generateWeightedPercentage(riskLevel === "high" ? "medium" : "low")
  const surfaceCleanliness = generateWeightedPercentage(riskLevel === "high" ? "medium" : "low")
  const cuttingBoardUsage = generateWeightedPercentage(riskLevel)
  const rawFoodSafety = generateWeightedPercentage(riskLevel)
  const bacterialRisk = generateWeightedPercentage(riskLevel === "high" ? "high" : "medium")

  // Calculate overall score
  const score = Number(
    (
      (protectiveGloves +
        safetyEquipment +
        surfaceCleanliness +
        cuttingBoardUsage +
        rawFoodSafety +
        (100 - bacterialRisk)) /
      6
    ).toFixed(1),
  )

  // Extract video duration
  const videoDuration = extractVideoDuration(fileName)

  // Determine how many findings to generate based on risk level
  const findingsCount =
    riskLevel === "high" ? randomInRange(3, 5) : riskLevel === "medium" ? randomInRange(2, 3) : randomInRange(1, 2)

  // Generate evenly distributed timestamps
  const timestamps = generateTimestamps(
    Math.min(findingsCount, 5), // Cap at 5 findings max
    videoDuration,
  )

  // Generate findings based on scores
  const keyFindings: Finding[] = []
  let timestampIndex = 0

  if (protectiveGloves < 70) {
    keyFindings.push({
      type: "critical",
      message: "Protective Gloves compliance below required threshold",
      timestamp: timestamps[timestampIndex++ % timestamps.length],
    })
  }

  if (safetyEquipment < 70) {
    keyFindings.push({
      type: "critical",
      message: "Safety Equipment compliance below required threshold",
      timestamp: timestamps[timestampIndex++ % timestamps.length],
    })
  }

  if (bacterialRisk > 50) {
    keyFindings.push({
      type: "critical",
      message: "High Bacterial Risk detected",
      timestamp: timestamps[timestampIndex++ % timestamps.length],
    })
  }

  if (cuttingBoardUsage < 80) {
    keyFindings.push({
      type: "moderate",
      message: "Cutting Board Usage needs improvement",
      timestamp: timestamps[timestampIndex++ % timestamps.length],
    })
  }

  if (rawFoodSafety < 80) {
    keyFindings.push({
      type: "moderate",
      message: "Raw Food Safety needs improvement",
      timestamp: timestamps[timestampIndex++ % timestamps.length],
    })
  }

  // Add random findings if we don't have enough
  while (keyFindings.length < Math.min(2, findingsCount)) {
    keyFindings.push({
      type: riskLevel === "high" ? "critical" : "moderate",
      message:
        riskLevel === "high"
          ? possibleFindings.critical[seed % possibleFindings.critical.length]
          : possibleFindings.moderate[seed % possibleFindings.moderate.length],
      timestamp: timestamps[timestampIndex++ % timestamps.length],
    })
  }

  // Limit findings to the determined count
  keyFindings.splice(findingsCount)

  // Generate relevant improvements based on findings
  const improvements = keyFindings
    .map((finding) => {
      const index = (seed + finding.message.length) % possibleImprovements.length
      return possibleImprovements[index]
    })
    .filter((improvement, index, self) => self.indexOf(improvement) === index)
    .slice(0, 3)

  // Generate current date and time for the report
  const now = new Date()
  const analyzedAt = now.toLocaleString()

  return {
    score,
    protectionMeasures: {
      protectiveGloves,
      safetyEquipment,
    },
    hygieneStandards: {
      surfaceCleanliness,
    },
    foodHandling: {
      cuttingBoardUsage,
      rawFoodSafety,
    },
    bacterialRisk,
    keyFindings,
    improvements,
    analyzedAt,
  }
}
