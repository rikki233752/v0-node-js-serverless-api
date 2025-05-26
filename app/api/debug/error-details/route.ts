import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing event log ID" }, { status: 400 })
    }

    const eventLog = await prisma.eventLog.findUnique({
      where: { id },
    })

    if (!eventLog) {
      return NextResponse.json({ error: "Event log not found" }, { status: 404 })
    }

    // Parse the error and payload JSON
    let error = null
    let payload = null

    try {
      if (eventLog.error) {
        error = JSON.parse(eventLog.error)
      }
    } catch (e) {
      error = { raw: eventLog.error, parseError: "Could not parse error JSON" }
    }

    try {
      if (eventLog.payload) {
        payload = JSON.parse(eventLog.payload)
      }
    } catch (e) {
      payload = { raw: eventLog.payload, parseError: "Could not parse payload JSON" }
    }

    return NextResponse.json({
      id: eventLog.id,
      pixelId: eventLog.pixelId,
      eventName: eventLog.eventName,
      status: eventLog.status,
      createdAt: eventLog.createdAt,
      error,
      payload,
    })
  } catch (error) {
    console.error("Error fetching event log details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
