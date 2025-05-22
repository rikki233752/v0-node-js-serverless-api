import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { findUserById } from "@/lib/mock-users"

export async function GET(req: NextRequest) {
  try {
    // Get the current user from the token
    const currentUser = getCurrentUser(req)
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Find the user in the database
    const user = await findUserById(currentUser.id.toString())
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Return the user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Get current user error:", error)
    return NextResponse.json({ error: "An error occurred while getting the current user" }, { status: 500 })
  }
}
