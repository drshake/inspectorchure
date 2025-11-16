import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { analysisId } = await request.json()

    if (!analysisId) {
      return NextResponse.json({ error: "Missing analysisId" }, { status: 400 })
    }

    // Update the analysis_results record to link it to the authenticated user
    const { error: updateError } = await supabase
      .from("analysis_results")
      .update({ vendor_id: user.id })
      .eq("id", analysisId)

    if (updateError) {
      console.error("Error linking guest analysis:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update or create vendor record
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!existingVendor) {
      // Create new vendor record for authenticated user
      const { error: vendorError } = await supabase.from("vendors").insert({
        id: user.id,
        email: user.email,
        is_anonymous: false,
        usage_count: 1,
      })

      if (vendorError) {
        console.error("Error creating vendor:", vendorError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in linkGuestAnalysis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
