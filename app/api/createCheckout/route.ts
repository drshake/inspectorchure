import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendorId, email } = body

    if (!vendorId) {
      return NextResponse.json({ error: "vendorId required" }, { status: 400 })
    }

    // Check if vendor already has a Stripe customer ID
    const { data: vendor } = await supabase
      .from("vendors")
      .select("stripe_customer_id")
      .eq("id", vendorId)
      .maybeSingle()

    let customerId = vendor?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: {
          vendor_id: vendorId,
        },
      })
      customerId = customer.id

      // Update vendor with Stripe customer ID
      await supabase.from("vendors").update({ stripe_customer_id: customerId, email }).eq("id", vendorId)
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/cancel`,
      metadata: {
        vendor_id: vendorId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("Stripe checkout error:", err)
    return NextResponse.json({ error: err.message || "Failed to create checkout session" }, { status: 500 })
  }
}
