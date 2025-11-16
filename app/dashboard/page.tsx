"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import VideoUpload from "@/components/VideoUpload"
import ResultsDisplay from "@/components/ResultsDisplay"
import { generateAnalysis } from "@/lib/analysis-generator"
import { Button } from "@/components/ui/button"

type AnalysisStatus = "idle" | "analyzing" | "complete"

interface Vendor {
  id: string
  name: string
  email: string | null
  stripeId: string | null
  usage_count: number
  subscription_status: string
  is_anonymous: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle")
  const [currentFileName, setCurrentFileName] = useState<string>("")

  useEffect(() => {
    async function initializeSession() {
      try {
        const response = await fetch("/api/startSession", {
          method: "POST",
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("Failed to start session")
        }

        const data = await response.json()
        setVendor(data.vendor)

        const usageLimit = 3
        const hasActiveSubscription =
          data.vendor.subscription_status === "active" || data.vendor.subscription_status === "trialing"

        if (data.vendor.usage_count >= usageLimit && !hasActiveSubscription) {
          setShowPaywall(true)
        }
      } catch (error) {
        console.error("Error initializing session:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeSession()
  }, [])

  const handleAnalysisStart = (fileName: string) => {
    setCurrentFileName(fileName)
    setAnalysisStatus("analyzing")
    // Simulate analysis process
    setTimeout(() => {
      setAnalysisStatus("complete")
    }, 5000)
  }

  const handleUpgrade = () => {
    // TODO: Redirect to Stripe checkout or pricing page
    console.log("Redirect to upgrade page")
    router.push("/pricing")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    )
  }

  if (showPaywall) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-12 text-center">
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-blue-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Free Trial Complete</h1>
              <p className="text-lg text-gray-600 mb-2">
                You've used all {vendor?.usage_count || 3} of your free hygiene inspections!
              </p>
              <p className="text-gray-600">Upgrade to continue analyzing your kitchen operations.</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">Premium Features</h2>
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">Unlimited hygiene inspections</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">Detailed compliance reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">Churred Safety Badge eligibility</span>
                </li>
              </ul>
            </div>

            <Button onClick={handleUpgrade} size="lg" className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              Upgrade to Premium
            </Button>

            <p className="text-sm text-gray-500 mt-4">
              Questions? Contact us at{" "}
              <a href="mailto:support@chureai.com" className="text-blue-500 hover:underline">
                support@chureai.com
              </a>
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm">
        <div className="px-6 py-8 md:px-8 md:py-10">
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-semibold text-blue-900 mb-2">Food Safety Video Inspector</h1>
            <p className="text-blue-800">Upload your kitchen preparation video for instant hygiene analysis</p>
            {vendor && vendor.is_anonymous && (
              <p className="text-sm text-gray-600 mt-2">
                Free inspections remaining: <span className="font-semibold">{Math.max(0, 3 - vendor.usage_count)}</span>
              </p>
            )}
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
            <ResultsDisplay
              status={analysisStatus}
              fileName={currentFileName}
              generateAnalysis={generateAnalysis}
              vendor={
                vendor
                  ? {
                      stripeId: vendor.stripeId || "cus_TEST",
                      name: vendor.name,
                      email: vendor.email || "demo@chureai.com",
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </main>
  )
}
