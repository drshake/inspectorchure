import { NextResponse } from "next/server"

// Simulated database
const emails: string[] = []

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
  }

  // Check if email already exists
  if (emails.includes(email)) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  // Add email to our simulated database
  emails.push(email)

  return NextResponse.json({ message: "Email registered successfully" }, { status: 201 })
}

export async function GET() {
  // This is just for demonstration purposes. In a real app, you wouldn't expose all emails like this.
  return NextResponse.json({ emails })
}
