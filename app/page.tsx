"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import VideoUpload from "@/components/VideoUpload"
import ResultsDisplay from "@/components/ResultsDisplay"
import AuthModal from "@/components/auth/AuthModal"
import { analyzeVideo } from "@/lib/video-analyzer"
import type { AnalysisResult } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

type AnalysisStatus = "idle" | "extracting" | "analyzing" | "complete"

export default function Home() {
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle")
  const [currentFileName, setCurrentFileName] = useState<string>("")
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Track pending results that haven't been saved yet (user wasn't signed in)
  const pendingResultsRef = useRef<{ results: AnalysisResult; duration: number } | null>(null)

  const saveAnalysis = useCallback(async (results: AnalysisResult, duration: number) => {
    try {
      const saveResponse = await fetch('/api/saveAnalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisResults: results,
          videoDuration: duration,
        }),
      })

      if (saveResponse.ok) {
        const saveData = await saveResponse.json()
        setAnalysisId(saveData.analysisId)
        setVendorId(saveData.vendorId)
        pendingResultsRef.current = null
        console.log('Analysis saved:', saveData.analysisId)
      } else {
        console.error('Failed to save analysis:', await saveResponse.text())
      }
    } catch (saveErr) {
      console.error('Error saving analysis:', saveErr)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)

      // User just signed in and we have unsaved results — save them now
      if (newUser && pendingResultsRef.current) {
        saveAnalysis(pendingResultsRef.current.results, pendingResultsRef.current.duration)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [saveAnalysis])

  const handleAnalysisStart = async (blob: Blob, duration: number, fileName: string) => {
    setCurrentFileName(fileName)
    setError(null)
    setAnalysisResults(null)
    setAnalysisId(null)

    try {
      setAnalysisStatus("extracting")

      const results = await analyzeVideo(blob, duration, (progress) => {
        if (progress.stage === 'extracting') {
          setAnalysisStatus("extracting")
        } else if (progress.stage === 'detecting' || progress.stage === 'scoring') {
          setAnalysisStatus("analyzing")
        }
      })

      console.log('Analysis completed:', results)
      setAnalysisResults(results)
      setAnalysisStatus("complete")

      // If signed in, save immediately. Otherwise, stash for after auth.
      if (user) {
        saveAnalysis(results, duration)
      } else {
        pendingResultsRef.current = { results, duration }
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      const errorStack = err instanceof Error ? err.stack : ''
      setError(`${errorMessage}\n\nStack trace:\n${errorStack}`)
      setAnalysisStatus("idle")
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm">
        <div className="px-6 py-8 md:px-8 md:py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[32px] font-semibold text-blue-900 mb-2">Food Safety Video Inspector</h1>
            <p className="text-blue-800">Upload your kitchen preparation video for instant hygiene analysis</p>
          </div>

          <VideoUpload onAnalysisStart={handleAnalysisStart} />

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg max-h-96 overflow-y-auto">
              <h3 className="text-red-900 font-semibold mb-2">Error Details:</h3>
              <pre className="text-red-700 text-xs whitespace-pre-wrap break-words font-mono">
                {error}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(error)
                  alert('Error copied to clipboard!')
                }}
                className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Copy Error
              </button>
            </div>
          )}

          {(analysisStatus === "extracting" || analysisStatus === "analyzing") && (
            <div className="mt-8 text-center py-12">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">Churring</h2>
              <div className="w-full max-w-xs mx-auto h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-loading-bar" />
              </div>
              <p className="text-sm text-blue-700 mt-4">Analyzing your kitchen for hygiene factors...</p>
              <style jsx>{`
                @keyframes loading-bar {
                  0% { width: 0%; margin-left: 0%; }
                  50% { width: 60%; margin-left: 20%; }
                  100% { width: 0%; margin-left: 100%; }
                }
                .animate-loading-bar {
                  animation: loading-bar 1.5s ease-in-out infinite;
                }
              `}</style>
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

          {analysisStatus === "complete" && (
            <ResultsDisplay
              status="complete"
              fileName={currentFileName}
              realResults={analysisResults}
              analysisId={analysisId}
              vendorId={vendorId}
            />
          )}

          {/* Post-analysis sign-in prompt — shown when results are ready and user is not signed in */}
          {analysisStatus === "complete" && !user && (
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">Save your results</h3>
              <p className="text-blue-700 text-sm mb-4">
                Enter your email to save this report, track your progress over time, and earn the Churred Safety Badge.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition"
              >
                Save with Email
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
        }}
      />
    </main>
  )
}
