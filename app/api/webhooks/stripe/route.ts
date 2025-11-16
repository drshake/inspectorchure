import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "No signature provided" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // Get raw body for signature verification
    const body = await request.text()
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const customerId = session.customer as string
    const email = session.customer_email

    try {
      // Find vendor by stripe_customer_id
      const { data: vendor, error: fetchError } = await supabase
        .from("vendors")
        .select("id, email, is_anonymous")
        .eq("stripe_customer_id", customerId)
        .maybeSingle()

      if (fetchError) {
        console.error("Error fetching vendor:", fetchError)
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      if (vendor) {
        // Update subscription status to active and mark as non-anonymous
        const { error: updateError } = await supabase
          .from("vendors")
          .update({
            subscription_status: "active",
            is_anonymous: false,
          })
          .eq("id", vendor.id)

        if (updateError) {
          console.error("Error updating vendor:", updateError)
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // If vendor doesn't have an email but checkout session does, update it
        if (!vendor.email && email) {
          // Create Supabase auth user
          const { error: authError } = await supabase.auth.admin.createUser({
            email,
            email_confirm: true,
          })

          if (authError) {
            console.error("Error creating auth user:", authError)
          }

          // Update vendor email
          await supabase.from("vendors").update({ email }).eq("id", vendor.id)
        }

        console.log(`Vendor ${vendor.id} subscription activated successfully`)
      } else {
        console.warn(`No vendor found with stripe_customer_id: ${customerId}`)
      }

      return NextResponse.json({ ok: true })
    } catch (e: any) {
      console.error("Error processing webhook:", e.message)
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Return success for other event types
  return NextResponse.json({ received: true })
}
