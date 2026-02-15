import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route: /api/vision/detect
 * Sends image to Google Cloud Vision API for label detection
 */

export async function POST(request: NextRequest) {
  try {
    const { image, frameNumber, timestamp } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Missing image data' },
        { status: 400 }
      )
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY

    if (!apiKey) {
      console.error('GOOGLE_CLOUD_VISION_API_KEY not configured')
      return NextResponse.json(
        { error: 'Vision API not configured', message: 'GOOGLE_CLOUD_VISION_API_KEY environment variable is missing' },
        { status: 500 }
      )
    }

    console.log(`[v0] Vision API call for frame ${frameNumber}, image size: ${image.length} chars, API key present: ${!!apiKey}`)

    // Call Google Cloud Vision API
    let visionResponse: Response
    try {
      visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: image,
                },
                features: [
                  {
                    type: 'LABEL_DETECTION',
                    maxResults: 20,
                  },
                ],
              },
            ],
          }),
        }
      )
    } catch (fetchError) {
      console.error('[v0] Vision API fetch failed:', fetchError)
      return NextResponse.json(
        { error: 'Failed to reach Vision API', message: fetchError instanceof Error ? fetchError.message : 'Network error' },
        { status: 502 }
      )
    }

    if (!visionResponse.ok) {
      let errorData: any = {}
      try {
        errorData = await visionResponse.json()
      } catch {
        errorData = { rawStatus: visionResponse.status, rawText: await visionResponse.text().catch(() => 'unreadable') }
      }
      console.error('[v0] Vision API error response:', JSON.stringify(errorData))
      
      const errorMessage = errorData?.error?.message || `Vision API returned status ${visionResponse.status}`
      return NextResponse.json(
        { error: errorMessage, message: errorMessage, details: errorData },
        { status: visionResponse.status }
      )
    }

    const visionData = await visionResponse.json()
    const annotations = visionData.responses?.[0]

    if (!annotations) {
      console.error('[v0] No annotations in response:', JSON.stringify(visionData))
      return NextResponse.json(
        { error: 'Empty response from Vision API', message: 'No annotations returned' },
        { status: 500 }
      )
    }

    if (annotations.error) {
      console.error('[v0] Vision API annotation error:', annotations.error)
      return NextResponse.json(
        { error: annotations.error.message, message: annotations.error.message },
        { status: 400 }
      )
    }

    // Extract labels
    const labels = (annotations.labelAnnotations || []).map((label: any) => ({
      description: label.description,
      score: label.score,
      mid: label.mid,
    }))

    console.log(`[v0] Frame ${frameNumber}: ${labels.length} labels detected`)

    return NextResponse.json({
      labels,
      frameNumber,
      timestamp,
    })
  } catch (error) {
    console.error('Vision detection error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
