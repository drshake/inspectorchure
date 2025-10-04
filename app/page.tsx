"use client"

import { useState } from "react"
import VideoUpload from "@/components/VideoUpload"
import ResultsDisplay from "@/components/ResultsDisplay"
import { generateAnalysis } from "@/lib/analysis-generator"

type AnalysisStatus = "idle" | "analyzing" | "complete"

export default function Home() {
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle")
  const [currentFileName, setCurrentFileName] = useState<string>("")

  const handleAnalysisStart = (fileName: string) => {
    setCurrentFileName(fileName)
    setAnalysisStatus("analyzing")
    // Simulate analysis process
    setTimeout(() => {
      setAnalysisStatus("complete")
    }, 5000)
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm">
        <div className="px-6 py-8 md:px-8 md:py-10">
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-semibold text-blue-900 mb-2">Food Safety Video Inspector</h1>
            <p className="text-blue-800">Upload your kitchen preparation video for instant hygiene analysis</p>
          </div>

          <VideoUpload onAnalysisStart={handleAnalysisStart} />

          {analysisStatus === "idle" && (
            <div className="text-center mt-8 pt-6 border-t border-gray-100">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">Welcome, Chure Founding Vendor!</h2>
              <p className="text-blue-800 leading-relaxed">
                You are now among the pioneers setting the new global food safety standard, with exclusive early access
                to hygiene scoring, violation reports, and your journey to the Churred Safety Badge.
              </p>
            </div>
          )}

          {(analysisStatus === "analyzing" || analysisStatus === "complete") && (
            <ResultsDisplay status={analysisStatus} fileName={currentFileName} generateAnalysis={generateAnalysis} />
          )}
        </div>
      </div>
    </main>
  )
}
