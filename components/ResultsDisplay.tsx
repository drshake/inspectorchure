"use client"

import { useState, useEffect, useRef } from "react"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"

type AnalysisStatus = "idle" | "analyzing" | "complete"

interface AnalysisResult {
  hygieneScore: number
  categories: {
    gloves: number
    bareHands: number
    hairNet: number
    cleanSurfaces: number
    equipment: number
    crossContam: number
  }
  improvements?: string // Added improvements field
}

interface Vendor {
  stripeId: string
  name: string
  email: string
}

interface ResultsDisplayProps {
  status: AnalysisStatus
  fileName: string
  analysisResults: AnalysisResult | null
  vendor?: Vendor
}

export default function ResultsDisplay({ status, fileName, analysisResults, vendor }: ResultsDisplayProps) {
  const [progress, setProgress] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
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

  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

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

  const toPercent = (val: number) => Math.round(val * 100)

  const CategoryBar = ({ label, value }: { label: string; value: number }) => {
    const percentage = toPercent(value)
    const barColor = percentage >= 80 ? "bg-green-500" : percentage >= 60 ? "bg-yellow-500" : "bg-red-500"

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`${barColor} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
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

  if (!analysisResults) {
    return (
      <div className="bg-white p-6">
        <h2 className="text-2xl font-semibold mb-4 text-blue-900">Generating Results</h2>
        <p className="text-sm text-blue-800">Please wait...</p>
      </div>
    )
  }

  const scoreStatus = getScoreStatus(analysisResults.hygieneScore)
  const scoreCircleColor = getScoreCircleColor(analysisResults.hygieneScore)

  return (
    <div className="bg-white space-y-8 mt-8 relative pb-16">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-blue-900">Hygiene Analysis Results</h2>
      </div>

      <div ref={reportRef} className="space-y-6">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-100"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className={scoreCircleColor}
                strokeDasharray={439.82}
                strokeDashoffset={439.82 - (439.82 * analysisResults.hygieneScore) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-4xl font-bold text-blue-900">{analysisResults.hygieneScore}</span>
                <span className="text-2xl text-gray-600">/100</span>
              </div>
            </div>
          </div>
          <div className={`inline-block px-4 py-2 rounded-full ${scoreStatus.color}`}>
            <span className={`font-medium ${scoreStatus.textColor}`}>{scoreStatus.label}</span>
          </div>
        </div>

        <section>
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Hygiene Categories</h3>
          <div className="space-y-4">
            <CategoryBar label="Gloves" value={analysisResults.categories.gloves} />
            <CategoryBar label="Bare Hands" value={analysisResults.categories.bareHands} />
            <CategoryBar label="Hair Net" value={analysisResults.categories.hairNet} />
            <CategoryBar label="Clean Surfaces" value={analysisResults.categories.cleanSurfaces} />
            <CategoryBar label="Equipment" value={analysisResults.categories.equipment} />
            <CategoryBar label="Cross Contamination" value={analysisResults.categories.crossContam} />
          </div>
        </section>

        {analysisResults.improvements && (
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Improvements</h3>
            <p className="text-gray-700 leading-relaxed">{analysisResults.improvements}</p>
          </section>
        )}

        <div className="flex items-center justify-center pt-6 border-t border-gray-100">
          <div className="inline-flex items-center">
            <span className="font-bold text-lg text-blue-900 mr-1">I am</span>
            <div className="relative h-7 w-7 mr-[-5px]">
              <Image src="/churred-logo.png" alt="C Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-lg text-blue-900">hurred</span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up z-50">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
