"use client"

import { useState, useEffect, useRef } from "react"
import { Progress } from "@/components/ui/progress"
import { Clock } from "lucide-react"
import Image from "next/image"

type AnalysisStatus = "idle" | "analyzing" | "complete"

interface AnalysisResult {
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
  keyFindings: Array<{
    type: "critical" | "moderate"
    message: string
    timestamp: string
  }>
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

// Update the props to include fileName
interface ResultsDisplayProps {
  status: AnalysisStatus
  fileName: string
  realResults?: AnalysisResult | null
}

export default function ResultsDisplay({ status, fileName, realResults }: ResultsDisplayProps) {
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === "analyzing") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 10
        })
      }, 500)

      return () => clearInterval(interval)
    }
  }, [status])

  useEffect(() => {
    if (status === "complete") {
      // Only use real CV analysis results
      if (realResults) {
        console.log('✅ Using REAL CV analysis results')
        setResults(realResults)
      } else {
        console.error('❌ No real results available - this should not happen!')
        setResults(null)
      }
    }
  }, [status, realResults])

  const getScoreStatus = (score: number) => {
    if (score >= 91) return { label: "Excellent", color: "bg-green-100", textColor: "text-green-800" }
    if (score >= 80) return { label: "Good", color: "bg-green-100", textColor: "text-green-800" }
    if (score >= 61) return { label: "Needs improvement", color: "bg-yellow-100", textColor: "text-yellow-800" }
    return { label: "Needs improvement", color: "bg-red-100", textColor: "text-red-800" }
  }

  const getScoreCircleColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 61) return "text-yellow-500"
    return "text-red-500"
  }

  if (status === "idle") {
    return null
  }

  if (status === "analyzing") {
    return (
      <div className="bg-white p-6">
        <h2 className="text-2xl font-semibold mb-4 text-blue-900">Churring</h2>
        <Progress value={progress} className="w-full" />
        <p className="mt-2 text-sm text-blue-800">Detecting hygiene-related factors...</p>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="bg-white p-6">
        <h2 className="text-2xl font-semibold mb-4 text-blue-900">Generating Results</h2>
        <p className="text-sm text-blue-800">Please wait...</p>
      </div>
    )
  }

  const scoreStatus = getScoreStatus(results.score)
  const scoreCircleColor = getScoreCircleColor(results.score)

  const MetricRow = ({ label, value, notDetected, category }: { label: string; value: number; notDetected?: boolean; category?: string }) => {
    // Show contextual message when not detected
    let displayValue = `${value.toFixed(1)}%`
    
    if (notDetected) {
      // Provide specific context based on category
      switch (category) {
        case 'gloves':
          displayValue = 'No gloves detected'
          break
        case 'equipment':
          displayValue = 'No equipment visible'
          break
        case 'food':
          displayValue = 'No food in video'
          break
        default:
          displayValue = 'Not detected in video'
      }
    }
    
    const textColor = notDetected ? 'text-gray-500 text-sm' : 'font-medium text-blue-900'
    
    return (
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded">
        <span className="text-blue-900">{label}</span>
        <span className={textColor}>{displayValue}</span>
      </div>
    )
  }

  return (
    <div className="bg-white space-y-8 mt-8 relative pb-16">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-blue-900">Hygiene Analysis Results</h2>
      </div>

      <div ref={reportRef} className="space-y-6">
        <div className="text-sm text-blue-800 mb-4">
          Analysis date: <span className="font-medium">{results.analyzedAt}</span>
        </div>

        <div className="text-center">
          <div className="relative inline-block mb-4">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="16"
                fill="none"
                className="text-gray-100"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="16"
                fill="none"
                className={scoreCircleColor}
                strokeDasharray={351.86}
                strokeDashoffset={351.86 - (351.86 * results.score) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-900">{results.score}%</span>
            </div>
          </div>
          <div className={`inline-block px-3 py-1 ${scoreStatus.color} rounded-full`}>
            <span className={`text-sm ${scoreStatus.textColor}`}>{scoreStatus.label}</span>
          </div>
        </div>

        <section>
          <h3 className="text-blue-500 font-medium mb-3">Protection Measures</h3>
          <div className="space-y-2">
            <MetricRow 
              label="Protective Gloves" 
              value={results.protectionMeasures.protectiveGloves}
              notDetected={!results.detectionMetadata?.glovesDetected && results.protectionMeasures.protectiveGloves === 0}
              category="gloves"
            />
            <MetricRow 
              label="Safety Equipment" 
              value={results.protectionMeasures.safetyEquipment}
              notDetected={!results.detectionMetadata?.equipmentDetected && results.protectionMeasures.safetyEquipment === 0}
              category="equipment"
            />
          </div>
        </section>

        <section>
          <h3 className="text-blue-500 font-medium mb-3">Food Handling</h3>
          <div className="space-y-2">
            <MetricRow 
              label="Cutting Board Usage" 
              value={results.foodHandling.cuttingBoardUsage}
              notDetected={!results.detectionMetadata?.equipmentDetected && results.foodHandling.cuttingBoardUsage === 0}
              category="equipment"
            />
            <MetricRow 
              label="Raw Food Safety" 
              value={results.foodHandling.rawFoodSafety}
              notDetected={!results.detectionMetadata?.foodDetected && results.foodHandling.rawFoodSafety >= 90}
              category="food"
            />
          </div>
        </section>

        <section>
          <h3 className="text-blue-900 font-medium mb-3">Key Findings</h3>
          <div className="space-y-2">
            {results.keyFindings.map((finding, index) => (
              <div
                key={index}
                className={`p-3 rounded flex items-start gap-2 ${
                  finding.type === "critical" ? "bg-red-50" : "bg-blue-50"
                }`}
              >
                <div className={`w-1 h-full rounded ${finding.type === "critical" ? "bg-red-500" : "bg-blue-500"}`} />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-sm font-medium ${finding.type === "critical" ? "text-red-700" : "text-blue-700"}`}
                    >
                      {finding.type === "critical" ? "Critical: " : "Moderate: "}
                    </span>
                    <div className="flex items-center text-xs text-gray-600 bg-white px-2 py-1 rounded">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Timestamp: {finding.timestamp}</span>
                    </div>
                  </div>
                  <span className="text-sm text-blue-900 block mt-1">{finding.message}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-blue-900 font-medium mb-3">Improvement Suggestions</h3>
          <div className="space-y-2">
            {results.improvements.map((improvement, index) => (
              <div key={index} className="p-3 bg-green-50 rounded flex items-start gap-2">
                <div className="w-1 h-full rounded bg-green-500" />
                <span className="text-sm text-blue-900">{improvement}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Churred Watermark */}
      <div className="absolute bottom-0 right-0 flex items-center p-4">
        <div className="flex items-center">
          <div className="inline-flex items-center">
            <span className="font-bold text-lg text-blue-900 mr-1">I am</span>
            <div className="relative h-7 w-7 mr-[-5px]">
              <Image src="/churred-logo.png" alt="C Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-lg text-blue-900">hurred</span>
          </div>
        </div>
      </div>
    </div>
  )
}
