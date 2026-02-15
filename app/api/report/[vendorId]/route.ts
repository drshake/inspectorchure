import { NextResponse } from "next/server"

// Mock database of vendor reports
const mockReports: Record<string, any> = {
  vendor123: {
    vendorId: "vendor123",
    vendorName: "Golden Spoon Restaurant",
    score: 70.8,
    status: "Needs improvement",
    analysisDate: "2025-10-11T08:43:07Z",
    protectionMeasures: {
      "Protective Gloves": 71.0,
      "Safety Equipment": 87.0,
    },
    foodHandling: {
      "Cutting Board Usage": 70.0,
      "Raw Food Safety": 69.0,
    },
    keyFindings: [
      { level: "Critical", message: "High bacterial risk detected", timestamp: "00:01" },
      { level: "Moderate", message: "Cutting Board Usage needs improvement", timestamp: "00:01" },
    ],
    improvementSuggestions: [
      "Ensure consistent use of clean gloves during food handling",
      "Regular maintenance of safety equipment",
    ],
  },
  vendor456: {
    vendorId: "vendor456",
    vendorName: "Fresh Bites Café",
    score: 92.5,
    status: "Excellent",
    analysisDate: "2025-10-10T14:22:15Z",
    protectionMeasures: {
      "Protective Gloves": 95.0,
      "Safety Equipment": 91.0,
    },
    foodHandling: {
      "Cutting Board Usage": 93.0,
      "Raw Food Safety": 91.0,
    },
    keyFindings: [
      { level: "Moderate", message: "Temperature monitoring could be more consistent", timestamp: "00:03" },
    ],
    improvementSuggestions: [
      "Implement automated temperature monitoring system",
      "Continue excellent hygiene practices",
    ],
  },
  vendor789: {
    vendorId: "vendor789",
    vendorName: "Urban Kitchen Co.",
    score: 82.3,
    status: "Good",
    analysisDate: "2025-10-09T11:15:42Z",
    protectionMeasures: {
      "Protective Gloves": 84.0,
      "Safety Equipment": 88.0,
    },
    foodHandling: {
      "Cutting Board Usage": 81.0,
      "Raw Food Safety": 76.0,
    },
    keyFindings: [
      { level: "Moderate", message: "Raw Food Safety needs improvement", timestamp: "00:02" },
      { level: "Moderate", message: "Food storage organization below standard", timestamp: "00:04" },
    ],
    improvementSuggestions: [
      "Implement proper food storage temperature monitoring",
      "Maintain separate cutting boards for different food types",
      "Establish regular cleaning schedule for all equipment",
    ],
  },
}

export async function GET(request: Request, { params }: { params: { vendorId: string } }) {
  const { vendorId } = params

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const report = mockReports[vendorId]

  if (!report) {
    return NextResponse.json({ error: "Vendor report not found" }, { status: 404 })
  }

  return NextResponse.json(report)
}
