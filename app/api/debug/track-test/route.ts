import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get recent track API calls from logs
    const recentLogs = await prisma.eventLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        pixelId: true,
        eventName: true,
        status: true,
        createdAt: true,
        error: true,
        payload: true,
      },
    })

    // Check if track API is receiving any requests
    const trackApiLogs = recentLogs.filter(
      (log) => log.eventName.includes("_received") || log.eventName.includes("track_api"),
    )

    // Get server logs for debugging
    const serverStatus = {
      databaseConnected: !!prisma,
      recentEventCount: recentLogs.length,
      trackApiHits: trackApiLogs.length,
      lastEventTime: recentLogs[0]?.createdAt || null,
    }

    return NextResponse.json({
      serverStatus,
      recentLogs: recentLogs.map((log) => ({
        ...log,
        payload: log.payload ? JSON.parse(log.payload) : null,
        error: log.error ? JSON.parse(log.error) : null,
      })),
      trackApiLogs,
      analysis: {
        isReceivingEvents: trackApiLogs.length > 0,
        lastSuccessfulEvent: recentLogs.find((log) => log.status === "success"),
        lastError: recentLogs.find((log) => log.status === "error"),
      },
    })
  } catch (error) {
    console.error("Error in track test:", error)
    return NextResponse.json({ error: "Failed to check track status" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log the test event
    await prisma.eventLog.create({
      data: {
        pixelId: "test_pixel",
        eventName: "manual_test_event",
        status: "success",
        payload: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true, message: "Test event logged", data: body })
  } catch (error) {
    console.error("Error in track test POST:", error)
    return NextResponse.json({ error: "Failed to log test event" }, { status: 500 })
  }
}
