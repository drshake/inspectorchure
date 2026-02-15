import { NextRequest, NextResponse } from 'next/server'
import { getVendor } from '@/lib/db-operations'

export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const vendorId = params.vendorId

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Missing vendor ID' },
        { status: 400 }
      )
    }

    const vendor = await getVendor(vendorId)

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ vendor })
  } catch (error) {
    console.error('Failed to fetch vendor:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch vendor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
