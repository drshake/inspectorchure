"use client"

import { useState } from "react"
import VideoUpload from "@/components/VideoUpload"
import ResultsDisplay from "@/components/ResultsDisplay"
import { generateAnalysis, type AnalysisResult } from "@/lib/analysis-generator"
import { analyzeVideo, type AnalysisProgress } from "@/lib/video-analyzer"

type AnalysisStatus = "idle" | "extracting" | "analyzing" | "complete"

export default function Home() {
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle")
  const [currentFileName, setCurrentFileName] = useState<string>("")
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalysisStart = async (blob: Blob, duration: number, fileName: string) => {
    setCurrentFileName(fileName)
    setError(null)
    setAnalysisResults(null)

    // Use real CV analysis
    try {
      setAnalysisStatus("extracting")
      
      const results = await analyzeVideo(blob, duration, (progress) => {
        setAnalysisProgress(progress)
        if (progress.stage === 'extracting') {
          setAnalysisStatus("extracting")
        } else if (progress.stage === 'detecting' || progress.stage === 'scoring') {
          setAnalysisStatus("analyzing")
        }
      })
      
      console.log('✅ Real CV analysis completed:', results)
      setAnalysisResults(results)
      setAnalysisStatus("complete")
    } catch (err) {
      console.error('❌ Real CV analysis failed:', err)
      setError(`CV Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setAnalysisStatus("idle")
    }
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

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-center">{error}</p>
            </div>
          )}

          {(analysisStatus === "extracting" || analysisStatus === "analyzing") && analysisProgress && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-center mb-2">
                {analysisProgress.message}
              </p>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress.progress}%` }}
                />
              </div>
              <p className="text-blue-600 text-sm text-center mt-2">
                {Math.round(analysisProgress.progress)}% complete
              </p>
            </div>
          )}

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
            <ResultsDisplay 
              status={analysisStatus === "analyzing" ? "analyzing" : "complete"} 
              fileName={currentFileName} 
              generateAnalysis={generateAnalysis}
              realResults={analysisResults}
            />
          )}
        </div>
      </div>
    </main>
  )
}
