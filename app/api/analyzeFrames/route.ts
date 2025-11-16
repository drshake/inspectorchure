import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import vision from "@google-cloud/vision"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Weights for hygiene scoring
const W = {
  gloves: 30,
  bareHands: 25,
  hairNet: 15,
  cleanSurfaces: 15,
  equipment: 10,
  crossContam: 5,
}
const TOTAL_W = W.gloves + W.bareHands + W.hairNet + W.cleanSurfaces + W.equipment + W.crossContam

// Helper functions for object detection
function pick(confThreshold = 0.6, ...names: string[]) {
  const set = new Set(names.map((n) => n.toLowerCase()))
  return (objs: any[]) =>
    objs.filter((o) => (o.score ?? o.confidence ?? 0) >= confThreshold && set.has(o.name?.toLowerCase())).length
}

function has(confThreshold = 0.6, ...names: string[]) {
  const f = pick(confThreshold, ...names)
  return (objs: any[]) => f(objs) > 0
}

function labelHas(labels: any[], ...names: string[]) {
  const set = new Set(names.map((n) => n.toLowerCase()))
  return labels.some((l) => set.has(l.description?.toLowerCase()))
}

function scoreFrame(objects: any[], labels: any[], safe: any) {
  // 1) Gloves (30%) — presence of "Glove" objects
  const glovePresent = has(0.6, "Glove")(objects)
  const glovesScore = glovePresent ? 1.0 : 0.3

  // 2) Bare Hands (25%) — inverse of gloves; if gloves missing but many persons, penalize
  const persons = pick(0.6, "Person")(objects)
  const bareHandsScore = glovePresent ? 0.9 : persons > 0 ? 0.3 : 0.6

  // 3) Hair Net (15%) — presence of hair cover items vs visible hair with persons
  const hairCover = has(0.5, "Hairnet", "Cap", "Chef hat", "Hat")(objects)
  const hairDetected = labelHas(labels, "hair")
  const hairNetScore = hairCover ? 1.0 : persons > 0 && hairDetected ? 0.4 : 0.7

  // 4) Clean Surfaces (15%) — kitchen/counter present and no "mess" labels
  const kitchenLike = labelHas(labels, "kitchen", "countertop", "worktop", "stainless steel")
  const messy = labelHas(labels, "spill", "stain", "dirty", "mess", "smear", "trash")
  const cleanSurfacesScore = kitchenLike ? (messy ? 0.5 : 0.9) : messy ? 0.4 : 0.7

  // 5) Equipment Usage (10%) — presence of standard kitchen gear implies workflow
  const equipmentPresent = has(0.5, "Cutting board", "Knife", "Pan", "Pot", "Tongs", "Apron", "Sanitizer")(objects)
  const equipmentScore = equipmentPresent ? 0.9 : 0.6

  // 6) Cross Contamination (5%) — penalize if raw meat + fresh produce together
  const rawMeat = labelHas(labels, "meat", "poultry", "chicken", "beef", "fish", "seafood")
  const produce = labelHas(labels, "lettuce", "vegetable", "tomato", "salad", "fruit")
  const sameSceneRisk = rawMeat && produce
  const crossContamScore = sameSceneRisk ? 0.3 : 0.9

  return {
    gloves: glovesScore,
    bareHands: bareHandsScore,
    hairNet: hairNetScore,
    cleanSurfaces: cleanSurfacesScore,
    equipment: equipmentScore,
    crossContam: crossContamScore,
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] analyzeFrames API called")

    const body = await request.json()
    const { vendorId, frames } = body

    console.log("[v0] Received vendorId:", vendorId)
    console.log("[v0] Received frames count:", frames?.length)

    if (!vendorId || !Array.isArray(frames) || frames.length === 0) {
      console.error("[v0] Invalid request: missing vendorId or frames")
      return NextResponse.json({ error: "vendorId and frames[] required" }, { status: 400 })
    }

    // Check if Google Cloud Vision credentials are available
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    console.log("[v0] Google credentials available:", !!credentialsJson)

    if (!credentialsJson) {
      console.error("[v0] Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable")
      return NextResponse.json(
        { error: "Google Cloud Vision API credentials not configured. Please contact support." },
        { status: 500 },
      )
    }

    let credentials
    try {
      credentials = JSON.parse(credentialsJson)
      console.log("[v0] Parsed credentials, project_id:", credentials.project_id)
    } catch (parseError: any) {
      console.error("[v0] Failed to parse credentials:", parseError)
      return NextResponse.json(
        { error: "Invalid Google Cloud Vision API credentials format. Please contact support." },
        { status: 500 },
      )
    }

    let client
    try {
      client = new vision.ImageAnnotatorClient({ credentials })
      console.log("[v0] Vision client initialized successfully")
    } catch (clientError: any) {
      console.error("[v0] Failed to initialize Vision client:", clientError)
      return NextResponse.json({ error: `Failed to initialize Vision API: ${clientError.message}` }, { status: 500 })
    }

    const perFrame = []

    // Analyze each frame
    for (let i = 0; i < frames.length; i++) {
      console.log(`[v0] Analyzing frame ${i + 1}/${frames.length}`)

      const frame = frames[i]

      // Vision accepts either GCS/HTTP URL or base64 content
      const img = frame.startsWith("data:image")
        ? { image: { content: frame.split(",")[1] } }
        : { image: { source: { imageUri: frame } } }

      try {
        const [objs] = await client.objectLocalization(img)
        const [labels] = await client.labelDetection(img)
        const [safeRes] = await client.safeSearchDetection(img)

        const objects = (objs.localizedObjectAnnotations || []).map((o: any) => ({
          name: o.name,
          score: o.score,
        }))
        const labelAnnotations = labels.labelAnnotations || []
        const safe = safeRes.safeSearchAnnotation || {}

        console.log(`[v0] Frame ${i + 1} - Objects found:`, objects.length)
        console.log(`[v0] Frame ${i + 1} - Labels found:`, labelAnnotations.length)

        perFrame.push({
          categories: scoreFrame(objects, labelAnnotations, safe),
          raw: {
            objects,
            labels: labelAnnotations.slice(0, 20),
            safe,
          },
        })
      } catch (visionError: any) {
        console.error(`[v0] Vision API error on frame ${i + 1}:`, visionError)
        return NextResponse.json(
          {
            error: `Vision API failed on frame ${i + 1}: ${visionError.message}. This may be due to API quota limits or billing issues.`,
          },
          { status: 500 },
        )
      }
    }

    // Average category scores across frames
    const keys = ["gloves", "bareHands", "hairNet", "cleanSurfaces", "equipment", "crossContam"]
    const avg: any = Object.fromEntries(
      keys.map((k) => [k, perFrame.reduce((a, f) => a + f.categories[k], 0) / perFrame.length]),
    )

    console.log("[v0] Average category scores:", avg)

    // Calculate weighted overall hygiene score (0..100)
    const hygieneScore = Math.round(
      ((avg.gloves * W.gloves +
        avg.bareHands * W.bareHands +
        avg.hairNet * W.hairNet +
        avg.cleanSurfaces * W.cleanSurfaces +
        avg.equipment * W.equipment +
        avg.crossContam * W.crossContam) /
        TOTAL_W) *
        100,
    )

    console.log("[v0] Calculated hygiene score:", hygieneScore)

    const improvementLines = []
    if (avg.gloves < 0.6) improvementLines.push("Wear disposable gloves when handling ready-to-eat foods.")
    if (avg.hairNet < 0.6) improvementLines.push("Ensure all staff wear hairnets or caps during preparation.")
    if (avg.cleanSurfaces < 0.6) improvementLines.push("Wipe work surfaces frequently to maintain visible cleanliness.")
    if (avg.equipment < 0.6) improvementLines.push("Organize utensils and sanitize equipment between uses.")
    if (avg.crossContam < 0.6) improvementLines.push("Avoid contact between raw meat and fresh produce.")
    const improvements =
      improvementLines.length > 0
        ? improvementLines.join(" ")
        : "Excellent hygiene performance. Keep up the great work!"

    console.log("[v0] Generated improvements:", improvements)

    console.log("[v0] Saving to database...")
    const { data: insertedRecord, error } = await supabase.from("analysis_results").insert({
      vendor_id: vendorId,
      hygiene_score: hygieneScore,
      categories: avg,
      frame_count: perFrame.length,
      vision_raw: perFrame.slice(0, 3),
      improvements,
    }).select().single()

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    console.log("[v0] Analysis complete, returning results with ID:", insertedRecord?.id)

    return NextResponse.json({
      ok: true,
      hygieneScore,
      categories: avg,
      improvements,
      analysisId: insertedRecord?.id, // Include analysis ID in response
    })
  } catch (error: any) {
    console.error("[v0] Unexpected error:", error)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.json(
      { error: `Unexpected error: ${error.message || "Unknown error occurred"}` },
      { status: 500 },
    )
  }
}
