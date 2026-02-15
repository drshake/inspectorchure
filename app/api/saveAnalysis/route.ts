import { NextRequest, NextResponse } from 'next/server'
import { saveAnalysisResult } from '@/lib/db-operations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysisResults, videoDuration } = body

    if (!analysisResults) {
      return NextResponse.json(
        { error: 'Missing analysis results' },
        { status: 400 }
      )
    }

    // Extract key findings - separate critical violations and positive observations
    const criticalViolations: string[] = []
    const positiveObservations: string[] = []
    const keyFindings: string[] = []

    analysisResults.keyFindings?.forEach((finding: any) => {
      if (finding.type === 'critical') {
        criticalViolations.push(finding.message)
      } else {
        positiveObservations.push(finding.message)
      }
      keyFindings.push(finding.message)
    })

    // Save to database
    const result = await saveAnalysisResult({
      hygieneScore: Math.round(analysisResults.score),
      videoDuration: videoDuration || null,
      keyFindings,
      improvementSuggestions: analysisResults.improvements || [],
      criticalViolations,
      positiveObservations,
    })

    return NextResponse.json({
      success: true,
      analysisId: result.id,
      vendorId: result.vendorId,
    })
  } catch (error) {
    console.error('Failed to save analysis:', error)
    return NextResponse.json(
      {
        error: 'Failed to save analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
