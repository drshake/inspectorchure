import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const existingVendorId = cookieStore.get("vendor_id")?.value

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    let vendor

    // Check if vendor_id cookie exists and is a valid UUID format
    if (existingVendorId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      if (uuidRegex.test(existingVendorId)) {
        // Fetch existing vendor record
        const { data, error } = await supabase.from("vendors").select("*").eq("id", existingVendorId).maybeSingle()

        if (error) {
          console.error("[v0] Error fetching vendor:", error)
        } else if (data) {
          vendor = data
        }
      } else {
        console.log("[v0] Invalid vendor_id format, creating new vendor")
      }
    }

    // If no vendor found, create a new anonymous vendor
    if (!vendor) {
      const { data: newVendor, error: createError } = await supabase
        .from("vendors")
        .insert({
          name: "Anonymous User",
          is_anonymous: true,
          subscription_status: "trial",
          first_active_at: new Date().toISOString(),
          usage_count: 0,
        })
        .select()
        .single()

      if (createError) {
        console.error("[v0] Error creating vendor:", createError)
        throw createError
      }

      vendor = newVendor
    }

    // Set vendor_id cookie (expires in 1 year)
    const response = NextResponse.json({
      ok: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        stripeId: vendor.stripe_customer_id,
        isAnonymous: vendor.is_anonymous,
        subscriptionStatus: vendor.subscription_status,
        usageCount: vendor.usage_count,
      },
    })

    response.cookies.set("vendor_id", vendor.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    return response
  } catch (err: any) {
    console.error("[v0] startSession error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
