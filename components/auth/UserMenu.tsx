"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"

interface UserMenuProps {
  onSignInClick: () => void
}

export default function UserMenu({ onSignInClick }: UserMenuProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setShowMenu(false)
  }

  if (loading) {
    return <div className="w-20 h-10 bg-gray-200 rounded animate-pulse" />
  }

  if (!user) {
    return (
      <Button
        onClick={onSignInClick}
        variant="outline"
        className="border-blue-200 hover:border-blue-300 hover:bg-blue-50"
      >
        Sign In
      </Button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
      >
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm hidden md:block">{user.email}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showMenu ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
