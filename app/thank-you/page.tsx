"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ThankYouPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6 text-balance">
          Thank You for Your High Hygiene Standards
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-blue-800 leading-relaxed mb-8 max-w-xl mx-auto">
          and for caring about your customers. Your Churred Vendor membership is now active — you can continue
          recording, earning trust, and showcasing spotless care in every kitchen session.
        </p>

        {/* CTA Button */}
        <Button
          onClick={() => router.push("/")}
          size="lg"
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg"
        >
          Continue to Dashboard
        </Button>

        {/* Churred Branding */}
        <div className="mt-12 pt-8 border-t border-blue-100">
          <div className="flex items-center justify-center">
            <span className="font-bold text-lg text-blue-900 mr-1">I am</span>
            <div className="relative h-7 w-7 mr-[-5px]">
              <Image src="/churred-logo.png" alt="C Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-lg text-blue-900">hurred</span>
          </div>
          <p className="text-sm text-blue-600 mt-2">Setting the new global food safety standard</p>
        </div>
      </div>
    </main>
  )
}
