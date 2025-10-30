"use client"

import { useState, useEffect, useRef } from "react"
import { Progress } from "@/components/ui/progress"
import { Clock } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

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
  const [isSharing, setIsSharing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
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

  const handleShare = async () => {
    if (!results) return

    setIsSharing(true)

    try {
      const shareText = `My Food Safety Hygiene Score: ${results.score}%\n\nI am Churred - Setting the new global food safety standard.`
      
      // Try native share API first (works on mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: "My Hygiene Analysis Report",
            text: shareText,
            url: window.location.href,
          })
          showToastMessage("Shared successfully!")
        } catch (err: any) {
          // User cancelled share or share failed
          if (err.name !== "AbortError") {
            console.error("Share failed:", err)
            // Fallback to screenshot share
            await shareScreenshot()
          }
        }
      } else {
        // Desktop fallback - try screenshot
        await shareScreenshot()
      }
    } catch (error) {
      console.error("Error sharing report:", error)
      showToastMessage("Failed to share report. Please try again.")
    } finally {
      setIsSharing(false)
    }
  }

  const shareScreenshot = async () => {
    if (!reportRef.current || !results) return

    try {
      // Dynamically import html2canvas only when needed
      const html2canvas = (await import("html2canvas")).default

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      })

      return new Promise<void>((resolve, reject) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error("Failed to create image"))
              return
            }

            const file = new File([blob], "hygiene-report.png", { type: "image/png" })

            // Try to share with file
            if (navigator.share && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: "My Hygiene Analysis Report",
                  text: `My Food Safety Hygiene Score: ${results.score}%`,
                })
                showToastMessage("Shared successfully!")
                resolve()
              } catch (err) {
                if ((err as any).name !== "AbortError") {
                  // Download as fallback
                  downloadImage(canvas)
                  resolve()
                }
              }
            } else {
              // Download as fallback
              downloadImage(canvas)
              resolve()
            }
          },
          "image/png",
          1.0,
        )
      })
    } catch (error) {
      console.error("Screenshot error:", error)
      throw error
    }
  }

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement("a")
    link.download = `hygiene-report-${new Date().getTime()}.png`
    link.href = canvas.toDataURL()
    link.click()
    showToastMessage("Report image downloaded!")
  }

  const handleDownloadPDF = async () => {
    if (!results) return

    setIsDownloading(true)

    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - 2 * margin
      let yPos = margin

      // Helper function to add new page if needed
      const checkAddPage = (spaceNeeded: number) => {
        if (yPos + spaceNeeded > pageHeight - margin) {
          pdf.addPage()
          yPos = margin
          return true
        }
        return false
      }

      // Background color
      pdf.setFillColor(249, 250, 251)
      pdf.rect(0, 0, pageWidth, pageHeight, "F")

      // Header
      pdf.setFontSize(24)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(17, 24, 39)
      pdf.text("Food Safety Hygiene Report", pageWidth / 2, yPos, { align: "center" })
      yPos += 15

      // Score
      pdf.setFontSize(48)
      pdf.setFont("helvetica", "bold")
      const scoreColor: [number, number, number] =
        results.score >= 80 ? [34, 197, 94] : results.score >= 61 ? [234, 179, 8] : [239, 68, 68]
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
      pdf.text(`${results.score}%`, pageWidth / 2, yPos + 15, { align: "center" })
      yPos += 25

      // Status Badge
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      const scoreStatus = getScoreStatus(results.score)
      pdf.text(scoreStatus.label, pageWidth / 2, yPos, { align: "center" })
      yPos += 10

      // Analysis Date & Time
      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(107, 114, 128)
      pdf.text(`Analyzed on ${results.analyzedAt}`, pageWidth / 2, yPos, { align: "center" })
      yPos += 15

      // Protection Measures Section
      checkAddPage(40)
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(59, 130, 246)
      pdf.text("Protection Measures", margin, yPos)
      yPos += 8

      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(17, 24, 39)

      const protectionMeasures = [
        ["Protective Gloves", results.protectionMeasures.protectiveGloves],
        ["Safety Equipment", results.protectionMeasures.safetyEquipment],
      ]

      protectionMeasures.forEach(([key, value]) => {
        checkAddPage(15)

        pdf.text(key as string, margin + 5, yPos)
        pdf.text(`${(value as number).toFixed(1)}%`, pageWidth - margin - 5, yPos, { align: "right" })
        yPos += 5

        const barWidth = contentWidth - 10
        const barHeight = 3

        pdf.setFillColor(229, 231, 235)
        pdf.rect(margin + 5, yPos, barWidth, barHeight, "F")

        pdf.setFillColor(34, 197, 94)
        pdf.rect(margin + 5, yPos, (barWidth * (value as number)) / 100, barHeight, "F")
        yPos += 10
      })

      yPos += 5

      // Food Handling Section
      checkAddPage(40)
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(59, 130, 246)
      pdf.text("Food Handling", margin, yPos)
      yPos += 8

      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(17, 24, 39)

      const foodHandling = [
        ["Cutting Board Usage", results.foodHandling.cuttingBoardUsage],
        ["Raw Food Safety", results.foodHandling.rawFoodSafety],
      ]

      foodHandling.forEach(([key, value]) => {
        checkAddPage(15)

        pdf.text(key as string, margin + 5, yPos)
        pdf.text(`${(value as number).toFixed(1)}%`, pageWidth - margin - 5, yPos, { align: "right" })
        yPos += 5

        const barWidth = contentWidth - 10
        const barHeight = 3

        pdf.setFillColor(229, 231, 235)
        pdf.rect(margin + 5, yPos, barWidth, barHeight, "F")

        pdf.setFillColor(34, 197, 94)
        pdf.rect(margin + 5, yPos, (barWidth * (value as number)) / 100, barHeight, "F")
        yPos += 10
      })

      yPos += 5

      // Key Findings Section
      checkAddPage(40)
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(17, 24, 39)
      pdf.text("Key Findings", margin, yPos)
      yPos += 8

      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")
      results.keyFindings.forEach((finding) => {
        const lines = pdf.splitTextToSize(finding.message, contentWidth - 10)
        const boxHeight = 8 + lines.length * 4
        checkAddPage(boxHeight + 5)

        const bgColor: [number, number, number] = finding.type === "critical" ? [254, 242, 242] : [254, 249, 195]
        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        pdf.rect(margin, yPos, contentWidth, boxHeight, "F")

        const textColor: [number, number, number] = finding.type === "critical" ? [185, 28, 28] : [161, 98, 7]
        pdf.setTextColor(textColor[0], textColor[1], textColor[2])
        pdf.setFont("helvetica", "bold")
        pdf.text(`${finding.type === "critical" ? "Critical" : "Moderate"}:`, margin + 3, yPos + 5)

        pdf.setTextColor(107, 114, 128)
        pdf.setFont("helvetica", "normal")
        pdf.text(finding.timestamp, pageWidth - margin - 3, yPos + 5, { align: "right" })

        pdf.setTextColor(17, 24, 39)
        pdf.text(lines, margin + 3, yPos + 10)

        yPos += boxHeight + 3
      })

      yPos += 5

      // Improvement Suggestions Section
      checkAddPage(40)
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(17, 24, 39)
      pdf.text("Improvement Suggestions", margin, yPos)
      yPos += 8

      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")
      results.improvements.forEach((suggestion) => {
        const lines = pdf.splitTextToSize(suggestion, contentWidth - 10)
        const boxHeight = 8 + lines.length * 4

        checkAddPage(boxHeight + 3)

        pdf.setFillColor(240, 253, 244)
        pdf.rect(margin, yPos, contentWidth, boxHeight, "F")

        pdf.setTextColor(17, 24, 39)
        pdf.text(lines, margin + 3, yPos + 5)

        yPos += boxHeight + 3
      })

      // Footer
      checkAddPage(15)
      yPos = pageHeight - margin - 10
      pdf.setFontSize(12)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(17, 24, 39)
      pdf.text("I am Churred", pageWidth / 2, yPos, { align: "center" })

      // Save PDF
      const timestamp = new Date().getTime()
      pdf.save(`Hygiene_Report_${timestamp}.pdf`)
      showToastMessage("Report downloaded successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      showToastMessage("Failed to download report. Please try again.")
    } finally {
      setIsDownloading(false)
    }
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
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-blue-900">Hygiene Analysis Results</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleShare}
            disabled={isSharing}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            size="sm"
            variant="outline"
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
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            size="sm"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {isDownloading ? "Generating..." : "Download"}
          </Button>
        </div>
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
              <span className="text-3xl font-bold text-blue-900">{results.score}%</span>
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
