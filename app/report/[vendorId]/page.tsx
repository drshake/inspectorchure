"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { use } from "react"

interface ReportData {
  vendorId: string
  vendorName: string
  score: number
  status: string
  analysisDate: string
  protectionMeasures: Record<string, number>
  foodHandling: Record<string, number>
  keyFindings: Array<{
    level: string
    message: string
    timestamp: string
  }>
  improvementSuggestions: string[]
}

export default function VendorReportPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const resolvedParams = use(params)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/report/${resolvedParams.vendorId}`)
        if (!response.ok) {
          throw new Error("Report not found")
        }
        const data = await response.json()
        setReport(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report")
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [resolvedParams.vendorId])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 61) return "text-yellow-500"
    return "text-red-500"
  }

  const getStatusColor = (status: string) => {
    if (status === "Excellent" || status === "Good") return "bg-green-100 text-green-800"
    if (status === "Needs improvement") return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600">{error || "The report you're looking for doesn't exist."}</p>
        </div>
      </div>
    )
  }

  const scoreColor = getScoreColor(report.score)
  const statusColor = getStatusColor(report.status)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.vendorName}</h1>
          <p className="text-gray-600">Food Safety Hygiene Report</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Summary Section */}
          <div className="p-8 text-center">
            {/* Score Circle */}
            <div className="relative inline-block mb-6">
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
                  className={scoreColor}
                  strokeDasharray={439.82}
                  strokeDashoffset={439.82 - (439.82 * report.score) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">{report.score}%</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`inline-block px-4 py-2 rounded-full mb-4 ${statusColor}`}>
              <span className="font-medium">{report.status}</span>
            </div>

            {/* Date */}
            <p className="text-sm text-gray-600 mb-6">Analyzed on {formatDate(report.analysisDate)}</p>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center mb-6">
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                {expanded ? "Hide" : "View"} full report
                <svg
                  className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={handleShare}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share Report
              </button>
            </div>

            {/* Churred Badge */}
            <div className="flex items-center justify-center pt-4 border-t border-gray-100">
              <div className="inline-flex items-center">
                <span className="font-bold text-lg text-gray-900 mr-1">I am</span>
                <div className="relative h-7 w-7 mr-[-5px]">
                  <Image src="/churred-logo.png" alt="C Logo" fill className="object-contain" />
                </div>
                <span className="font-bold text-lg text-gray-900">hurred</span>
              </div>
            </div>
          </div>

          {/* Expandable Details */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              expanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-8 pb-8 space-y-6">
              {/* Protection Measures */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Protection Measures</h3>
                <div className="space-y-3">
                  {Object.entries(report.protectionMeasures).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{key}</span>
                        <span className="font-medium text-gray-900">{value.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Food Handling */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Food Handling</h3>
                <div className="space-y-3">
                  {Object.entries(report.foodHandling).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{key}</span>
                        <span className="font-medium text-gray-900">{value.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Key Findings */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Findings</h3>
                <div className="space-y-2">
                  {report.keyFindings.map((finding, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg flex items-start gap-3 ${
                        finding.level === "Critical" ? "bg-red-50" : "bg-yellow-50"
                      }`}
                    >
                      <div
                        className={`w-1 h-full rounded ${
                          finding.level === "Critical" ? "bg-red-500" : "bg-yellow-500"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={`text-sm font-medium ${
                              finding.level === "Critical" ? "text-red-700" : "text-yellow-700"
                            }`}
                          >
                            {finding.level}:
                          </span>
                          <span className="text-xs text-gray-500">{finding.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-700">{finding.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Improvement Suggestions */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Improvement Suggestions</h3>
                <div className="space-y-2">
                  {report.improvementSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded-lg flex items-start gap-3">
                      <div className="w-1 h-full rounded bg-green-500" />
                      <p className="text-sm text-gray-700 flex-1">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Link copied to clipboard!
        </div>
      )}
    </div>
  )
}
