"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AuthCardProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AuthCard({ onSuccess, onCancel }: AuthCardProps) {
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [step, setStep] = useState<"email" | "otp">("email")

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}`,
        },
      })
      if (error) throw error
      setSuccess("Check your email for the verification code!")
      setStep("otp")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to send code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      })
      if (error) throw error
      setSuccess("Successfully signed in!")
      
      // Link guest trial data if exists
      const guestAnalysisId = localStorage.getItem("lastGuestAnalysisId")
      if (guestAnalysisId) {
        await fetch("/api/linkGuestAnalysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId: guestAnalysisId }),
        })
        localStorage.removeItem("lastGuestAnalysisId")
      }
      
      localStorage.removeItem("inspectorChureTrialUsed")
      
      if (onSuccess) onSuccess()
      else window.location.reload()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Invalid code")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-blue-900">InspectorChure</CardTitle>
        <CardDescription className="text-base">
          Sign in or create an account to save your hygiene reports and earn your Churred Safety Badge.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleSendOtp}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Continue"}
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} className="w-full">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <label htmlFor="otp" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep("email")
                  setOtp("")
                  setError(null)
                  setSuccess(null)
                }}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
