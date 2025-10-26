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

    // Get API key from environment (for API key method)
    // Note: Vision API prefers service account, but API key works if properly configured
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY

    if (!apiKey) {
      console.error('GOOGLE_CLOUD_VISION_API_KEY not configured')
      return NextResponse.json(
        { error: 'Vision API not configured' },
        { status: 500 }
      )
    }

    // Call Google Cloud Vision API with API key in URL parameter
    // Note: This method works if the API key is properly restricted and has Vision API enabled
    const visionResponse = await fetch(
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
                  maxResults: 20, // Get top 20 labels
                },
              ],
            },
          ],
        }),
      }
    )

    if (!visionResponse.ok) {
      const errorData = await visionResponse.json()
      console.error('Vision API error:', errorData)
      return NextResponse.json(
        { error: 'Vision API request failed', details: errorData },
        { status: visionResponse.status }
      )
    }

    const visionData = await visionResponse.json()
    const annotations = visionData.responses[0]

    if (annotations.error) {
      console.error('Vision API annotation error:', annotations.error)
      return NextResponse.json(
        { error: annotations.error.message },
        { status: 400 }
      )
    }

    // Extract labels
    const labels = (annotations.labelAnnotations || []).map((label: any) => ({
      description: label.description,
      score: label.score,
      mid: label.mid,
    }))

    // Log first few frames to see what we're detecting
    if (frameNumber <= 3) {
      console.log(`Frame ${frameNumber} detected labels:`, 
        labels.slice(0, 10).map((l: any) => `${l.description} (${(l.score * 100).toFixed(1)}%)`).join(', ')
      )
      console.log(`  Total labels returned: ${labels.length}`)
      
      // Show all labels if less than 10
      if (labels.length <= 10) {
        console.log(`  ALL labels:`, JSON.stringify(labels.map((l: any) => l.description)))
      }
    }

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
