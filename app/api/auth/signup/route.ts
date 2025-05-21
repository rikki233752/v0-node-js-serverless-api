import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { name, email, password } = body

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    // For now, just return a successful response without database interaction
    return NextResponse.json({
      success: true,
      user: {
        id: `user_${Date.now()}`,
        name,
        email,
        role: "user",
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    // Ensure we always return a JSON response, even for errors
    return NextResponse.json({ error: "An error occurred during signup" }, { status: 500 })
  }
}
