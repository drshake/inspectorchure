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
  created_at: string
}

// Save analysis result to database
export async function saveAnalysisResult(data: {
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

  // Create or get vendor if name is provided
  let vendorId: string | null = null
  if (data.vendorName) {
    const { data: existingVendor } = await supabase.from("vendors").select("id").eq("name", data.vendorName).single()

    if (existingVendor) {
      vendorId = existingVendor.id
    } else {
      const { data: newVendor, error: vendorError } = await supabase
        .from("vendors")
        .insert({
          name: data.vendorName,
          location: data.vendorLocation || null,
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
  return result
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
