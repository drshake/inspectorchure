"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus } from "lucide-react"

export default function EmailSignupForm() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to sign up")
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return <p className="text-green-600 text-sm">Thank you for signing up!</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="border-blue-200 focus:border-blue-300 focus:ring-blue-200"
      />
      <Button
        type="submit"
        variant="outline"
        disabled={isSubmitting}
        className="w-full border-blue-200 hover:border-blue-300 hover:bg-blue-50"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {isSubmitting ? "Signing up..." : "Sign up"}
      </Button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  )
}
