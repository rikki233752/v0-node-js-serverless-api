import { NextResponse } from "next/server"
import { clearAuthCookies } from "@/lib/auth"

export async function POST() {
  try {
    // Create the response
    const response = NextResponse.json({ success: true })

    // Clear the auth cookies
    return clearAuthCookies(response)
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "An error occurred during logout" }, { status: 500 })
  }
}
