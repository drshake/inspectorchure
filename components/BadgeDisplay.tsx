"use client"

import { useEffect, useState } from "react"
import { getVendor, type Vendor } from "@/lib/db-operations"

interface BadgeDisplayProps {
  vendorId: string | null
  score: number
  inline?: boolean
}

export default function BadgeDisplay({ vendorId, score, inline = false }: BadgeDisplayProps) {
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vendorId) {
      setLoading(false)
      return
    }

    // Fetch vendor data to get badge status
    fetch(`/api/vendor/${vendorId}`)
      .then((res) => res.json())
      .then((data) => {
        setVendor(data.vendor)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch vendor:", err)
        setLoading(false)
      })
  }, [vendorId])

  const badgeThreshold = 80
  const earnedBadge = score >= badgeThreshold

  if (!earnedBadge) return null

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-24 w-full" />
    )
  }

  const badgeStatus = vendor?.badge_status || "none"
  const isActive = badgeStatus === "active"
  const isExpired = badgeStatus === "expired"

  if (inline) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-semibold text-green-800">Churred Safety Badge Earned!</span>
      </div>
    )
  }

  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
      <div className="text-center">
        {/* Badge Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Badge Title */}
        <h3 className="text-2xl font-bold text-green-900 mb-2">
          Churred Safety Badge {isExpired && "(Expired)"}
        </h3>

        {/* Badge Description */}
        <p className="text-green-800 mb-4">
          {isActive
            ? "Congratulations! You've earned the Churred Safety Badge with a hygiene score of 80% or above."
            : isExpired
            ? "Your badge has expired. Complete a new analysis to renew your badge."
            : "Congratulations! You've achieved a hygiene score of 80% or above."}
        </p>

        {/* Badge Details */}
        {vendor && isActive && vendor.badge_expires_at && (
          <div className="text-sm text-green-700">
            <p className="font-medium">
              Badge valid until: {new Date(vendor.badge_expires_at).toLocaleDateString()}
            </p>
            <p className="text-xs mt-1">Re-test before expiration to maintain your badge</p>
          </div>
        )}

        {/* Call to Action */}
        {!vendor?.user_id && (
          <div className="mt-4 p-3 bg-white/50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-medium">
              Sign in to save your badge and display it on your website!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
