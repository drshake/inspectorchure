import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route: /api/vision/analyze
 * Sends image to Qwen3-VL via Hugging Face Inference API for hygiene analysis
 */

const SYSTEM_PROMPT = `You are a food safety inspector analyzing kitchen images. For each image, detect the presence of the following hygiene categories. Respond ONLY with a JSON object (no markdown, no explanation) using this exact schema:

{
  "protectiveGloves": { "detected": boolean, "confidence": number, "details": string },
  "bareHands": { "detected": boolean, "confidence": number, "details": string },
  "hairNet": { "detected": boolean, "confidence": number, "details": string },
  "cleanSurface": { "detected": boolean, "confidence": number, "details": string },
  "properApron": { "detected": boolean, "confidence": number, "details": string },
  "handwashStation": { "detected": boolean, "confidence": number, "details": string },
  "pestSigns": { "detected": boolean, "confidence": number, "details": string },
  "crossContamination": { "detected": boolean, "confidence": number, "details": string }
}

Rules:
- "confidence" is a number between 0 and 1
- "details" is a brief description of what you see
- "detected" is true only if you clearly see evidence of that category
- protectiveGloves: Food-safe gloves worn on hands while handling food
- bareHands: Ungloved hands directly touching food, food contact surfaces, or utensils
- hairNet: Hair net, chef hat, bandana, or head covering that restrains hair
- cleanSurface: Visibly clean countertops, cutting boards, work surfaces (no grease, food debris, stains, spills)
- properApron: Clean apron or chef coat being worn (no visible stains or food debris)
- handwashStation: Dedicated handwashing sink visible with soap dispenser and paper towels within reach, OR person actively washing their hands with soap
- pestSigns: Rodent droppings, insects (flies, cockroaches, ants), pest damage, or infestation evidence
- crossContamination: Raw meat/poultry/fish in direct physical contact with ready-to-eat foods`

function parseVLMResponse(text: string): Record<string, { detected: boolean; confidence: number; details: string }> | null {
  // Attempt 1: Direct JSON parse
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && 'protectiveGloves' in parsed) {
      return parsed
    }
  } catch {
    // Continue to next attempt
  }

  // Attempt 2: Extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim())
      if (parsed && typeof parsed === 'object' && 'protectiveGloves' in parsed) {
        return parsed
      }
    } catch {
      // Continue to next attempt
    }
  }

  // Attempt 3: Regex for JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && typeof parsed === 'object' && 'protectiveGloves' in parsed) {
        return parsed
      }
    } catch {
      // Fall through
    }
  }

  return null
}

const DEFAULT_CATEGORY = { detected: false, confidence: 0, details: 'Not detected' }

function getFallbackCategories() {
  return {
    protectiveGloves: { ...DEFAULT_CATEGORY },
    bareHands: { ...DEFAULT_CATEGORY },
    hairNet: { ...DEFAULT_CATEGORY },
    cleanSurface: { ...DEFAULT_CATEGORY },
    properApron: { ...DEFAULT_CATEGORY },
    handwashStation: { ...DEFAULT_CATEGORY },
    pestSigns: { ...DEFAULT_CATEGORY },
    crossContamination: { ...DEFAULT_CATEGORY },
  }
}

export async function POST(request: NextRequest) {
  try {
    const { image, frameNumber, timestamp } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Missing image data' },
        { status: 400 }
      )
    }

    const apiToken = process.env.HUGGINGFACE_API_TOKEN
    if (!apiToken) {
      console.error('HUGGINGFACE_API_TOKEN not configured')
      return NextResponse.json(
        { error: 'VLM API not configured', message: 'HUGGINGFACE_API_TOKEN environment variable is missing' },
        { status: 500 }
      )
    }

    const model = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-VL-7B-Instruct'

    // Ensure base64 image has proper data URI for the API
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const imageUrl = `data:image/jpeg;base64,${base64Data}`

    console.log(`[VLM] Analyzing frame ${frameNumber} with ${model}`)

    let response: Response
    try {
      response = await fetch(
        `https://router.huggingface.co/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                  },
                  {
                    type: 'text',
                    text: 'Analyze this kitchen image for food safety compliance. Return JSON only.',
                  },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 1024,
          }),
        }
      )
    } catch (fetchError) {
      console.error('[VLM] HF API fetch failed:', fetchError)
      return NextResponse.json(
        { error: 'Failed to reach VLM API', message: fetchError instanceof Error ? fetchError.message : 'Network error' },
        { status: 502 }
      )
    }

    // Handle rate limiting
    if (response.status === 429) {
      console.warn('[VLM] Rate limited, returning fallback')
      return NextResponse.json({
        frameNumber,
        timestamp,
        categories: getFallbackCategories(),
      })
    }

    // Handle model loading
    if (response.status === 503) {
      console.warn('[VLM] Model loading, returning fallback')
      return NextResponse.json({
        frameNumber,
        timestamp,
        categories: getFallbackCategories(),
      })
    }

    if (!response.ok) {
      let errorData: any = {}
      try {
        errorData = await response.json()
      } catch {
        errorData = { rawStatus: response.status, rawText: await response.text().catch(() => 'unreadable') }
      }
      console.error('[VLM] API error response:', JSON.stringify(errorData))
      const errorMessage = errorData?.error?.message || errorData?.message || `VLM API returned status ${response.status}`
      return NextResponse.json(
        { error: errorMessage, message: errorMessage, details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    console.log(`[VLM] Frame ${frameNumber} raw response length: ${content.length}`)

    // Parse the VLM response
    const categories = parseVLMResponse(content)

    if (!categories) {
      console.warn(`[VLM] Failed to parse response for frame ${frameNumber}, using fallback`)
      return NextResponse.json({
        frameNumber,
        timestamp,
        categories: getFallbackCategories(),
      })
    }

    return NextResponse.json({
      frameNumber,
      timestamp,
      categories,
    })
  } catch (error) {
    console.error('[VLM] Analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
