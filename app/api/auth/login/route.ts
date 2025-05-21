import { type NextRequest, NextResponse } from "next/server"
import { findUserByEmail } from "@/lib/mock-users"
import { comparePassword, setAuthCookies } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json()
    const { email, password } = body

    // Validate the input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Find the user
    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Verify the password
    const isPasswordValid = await comparePassword(password, user.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Create the response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })

    // Set the auth cookies
    return setAuthCookies(response, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
