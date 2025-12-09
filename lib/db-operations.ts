import { createClient } from "@/lib/supabase/server"

export interface AnalysisResult {
  id: string
  vendor_id: string | null
  hygiene_score: number
  video_duration: number | null
  analyzed_at: string
  key_findings: string[]
  improvement_suggestions: string[]
  critical_violations: string[]
  positive_observations: string[]
  share_count: number
  created_at: string
}

export interface Vendor {
  id: string
  name: string
  location: string | null
  user_id: string | null
  email: string | null
  is_anonymous: boolean
  claimed_at: string | null
  badge_status: 'none' | 'active' | 'expired'
  badge_earned_at: string | null
  badge_expires_at: string | null
  highest_score: number
  total_analyses: number
  last_analysis_at: string | null
  created_at: string
}

// Save analysis result to database
export async function saveAnalysisResult(data: {
  vendorId?: string
  vendorName?: string
  vendorLocation?: string
  hygieneScore: number
  videoDuration?: number
  keyFindings: string[]
  improvementSuggestions: string[]
  criticalViolations: string[]
  positiveObservations: string[]
}) {
  const supabase = await createClient()

  // Get current user (if authenticated)
  const { data: { user } } = await supabase.auth.getUser()

  // Create or get vendor
  let vendorId: string | null = data.vendorId || null

  if (!vendorId) {
    if (user) {
      // Authenticated user - create or get their vendor
      const { data: existingVendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .single()

      if (existingVendor) {
        vendorId = existingVendor.id
      } else {
        const { data: newVendor, error: vendorError } = await supabase
          .from("vendors")
          .insert({
            name: data.vendorName || user.email || "Vendor",
            location: data.vendorLocation || null,
            user_id: user.id,
            email: user.email,
            is_anonymous: false,
          })
          .select("id")
          .single()

        if (vendorError) throw vendorError
        vendorId = newVendor.id
      }
    } else if (data.vendorName) {
      // Anonymous user with vendor name
      const { data: newVendor, error: vendorError } = await supabase
        .from("vendors")
        .insert({
          name: data.vendorName,
          location: data.vendorLocation || null,
          is_anonymous: true,
        })
        .select("id")
        .single()

      if (vendorError) throw vendorError
      vendorId = newVendor.id
    }
  }

  // Insert analysis result
  const { data: result, error } = await supabase
    .from("analysis_results")
    .insert({
      vendor_id: vendorId,
      hygiene_score: data.hygieneScore,
      video_duration: data.videoDuration || null,
      key_findings: data.keyFindings,
      improvement_suggestions: data.improvementSuggestions,
      critical_violations: data.criticalViolations,
      positive_observations: data.positiveObservations,
    })
    .select()
    .single()

  if (error) throw error

  // Check and award badge if vendor exists
  if (vendorId) {
    await checkAndAwardBadge(vendorId, data.hygieneScore)
  }

  return { ...result, vendorId }
}

// Get analysis result by ID
export async function getAnalysisResult(id: string): Promise<AnalysisResult | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("analysis_results").select("*").eq("id", id).single()

  if (error) return null
  return data
}

// Increment share count
export async function incrementShareCount(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc("increment_share_count", {
    analysis_id: id,
  })

  if (error) throw error
}

// Get recent analysis results
export async function getRecentAnalyses(limit = 10) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("analysis_results")
    .select("*, vendors(name, location)")
    .order("analyzed_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Check and award badge to vendor
export async function checkAndAwardBadge(vendorId: string, score: number) {
  const supabase = await createClient()

  const { error } = await supabase.rpc("check_and_award_badge", {
    p_vendor_id: vendorId,
    p_score: score,
  })

  if (error) {
    console.error("Failed to check/award badge:", error)
    // Don't throw - badge logic shouldn't break the main flow
  }
}

// Get vendor by ID with badge info
export async function getVendor(vendorId: string): Promise<Vendor | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .single()

  if (error) return null
  return data
}

// Get vendor by user ID
export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) return null
  return data
}

// Claim an anonymous vendor
export async function claimVendor(vendorId: string, userId: string, email: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("claim_vendor", {
    p_vendor_id: vendorId,
    p_user_id: userId,
    p_email: email,
  })

  if (error) {
    console.error("Failed to claim vendor:", error)
    return false
  }

  return data
}

// Update expired badges (should be called periodically)
export async function updateExpiredBadges() {
  const supabase = await createClient()

  const { error } = await supabase.rpc("update_expired_badges")

  if (error) {
    console.error("Failed to update expired badges:", error)
  }
}
