import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
