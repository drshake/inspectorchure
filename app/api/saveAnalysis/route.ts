import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { stripeCustomerId, name, email, score, reportUrl } = body

    if (!stripeCustomerId || !score) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // 1. Find vendor
    const { data: vendor } = await supabase
      .from("vendors")
      .select("*")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle()

    let vendorId = vendor?.id

    // 2. Create vendor if not found
    if (!vendorId) {
      const { data: newVendor, error: createErr } = await supabase
        .from("vendors")
        .insert({
          stripe_customer_id: stripeCustomerId,
          name,
          email,
          subscription_status: "active",
        })
        .select()
        .single()

      if (createErr) throw createErr
      vendorId = newVendor.id
    }

    // 3. Insert analysis
    const { error: analysisErr } = await supabase.from("analysis_results").insert({
      vendor_id: vendorId,
      hygiene_score: score,
      report_url: reportUrl,
    })

    if (analysisErr) throw analysisErr

    await supabase
      .from("vendors")
      .update({ usage_count: (vendor?.usage_count || 0) + 1 })
      .eq("id", vendorId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[v0] saveAnalysis error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
