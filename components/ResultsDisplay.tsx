"use client"

import { useState, useEffect, useRef } from "react"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import html2canvas from "html2canvas"

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
}

// Update the props to include fileName and generateAnalysis
interface ResultsDisplayProps {
  status: AnalysisStatus
  fileName: string
  generateAnalysis: (fileName: string) => AnalysisResult
}

export default function ResultsDisplay({ status, fileName, generateAnalysis }: ResultsDisplayProps) {
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [isSharing, setIsSharing] = useState(false)
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
      // Generate unique analysis results based on the filename
      const analysisResults = generateAnalysis(fileName)
      setResults(analysisResults)
    }
  }, [status, fileName, generateAnalysis])

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

  const handleShare = async () => {
    if (!reportRef.current || !results) return

    setIsSharing(true)

    try {
      // Capture the report as an image
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      })

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Failed to create image")
        }

        const file = new File([blob], "hygiene-report.png", { type: "image/png" })
        const shareText = `My Food Safety Hygiene Score: ${results.score}% 🎯\n\nI am Churred - Setting the new global food safety standard! 🍽️✨`

        // Check if Web Share API is available (mainly for mobile)
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: "My Hygiene Analysis Report",
              text: shareText,
              files: [file],
            })
          } catch (err: any) {
            if (err.name !== "AbortError") {
              console.error("Share failed:", err)
              // Fallback to download
              downloadImage(canvas)
            }
          }
        } else {
          // Fallback: Download the image
          downloadImage(canvas)
        }
      }, "image/png")
    } catch (error) {
      console.error("Error sharing report:", error)
      alert("Failed to share report. Please try again.")
    } finally {
      setIsSharing(false)
    }
  }

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement("a")
    link.download = `hygiene-report-${new Date().getTime()}.png`
    link.href = canvas.toDataURL()
    link.click()
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

  const MetricRow = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded">
      <span className="text-blue-900">{label}</span>
      <span className="font-medium text-blue-900">{value.toFixed(1)}%</span>
    </div>
  )

  return (
    <div className="bg-white space-y-8 mt-8 relative pb-16">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-blue-900">Hygiene Analysis Results</h2>
        <Button
          onClick={handleShare}
          disabled={isSharing}
          className="bg-blue-500 hover:bg-blue-600 text-white"
          size="sm"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          {isSharing ? "Preparing..." : "Share"}
        </Button>
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
            <MetricRow label="Protective Gloves" value={results.protectionMeasures.protectiveGloves} />
            <MetricRow label="Safety Equipment" value={results.protectionMeasures.safetyEquipment} />
          </div>
        </section>

        <section>
          <h3 className="text-blue-500 font-medium mb-3">Food Handling</h3>
          <div className="space-y-2">
            <MetricRow label="Cutting Board Usage" value={results.foodHandling.cuttingBoardUsage} />
            <MetricRow label="Raw Food Safety" value={results.foodHandling.rawFoodSafety} />
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
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
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

        {/* Churred Watermark */}
        <div className="flex items-center justify-end pt-4">
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
