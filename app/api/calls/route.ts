import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")
    const phoneNumber = searchParams.get("phoneNumber")

    // For now, return mock data until we fully implement the database functions
    const mockCalls = [
      {
        id: "1",
        fromNumber: "+15551234567",
        toNumber: "+15559876543",
        pathwayName: "Sales Qualification",
        status: "completed",
        duration: 120,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      },
      {
        id: "2",
        fromNumber: "+15551234568",
        toNumber: "+15559876544",
        pathwayName: "Customer Support",
        status: "completed",
        duration: 180,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      },
    ]

    return NextResponse.json(mockCalls)
  } catch (error) {
    console.error("Error fetching calls:", error)
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 })
  }
}
