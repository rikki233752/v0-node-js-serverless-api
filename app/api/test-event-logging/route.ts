import { NextResponse } from "next/server"
import { testEventLogging } from "@/lib/event-logger"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Test database connection
    let dbStatus = "unknown"
    try {
      await prisma.$queryRaw`SELECT 1`
      dbStatus = "connected"
    } catch (dbError) {
      dbStatus = "error"
      console.error("Database connection test failed:", dbError)
    }

    // Test event logging
    const testResult = await testEventLogging()

    // Get recent logs
    let recentLogs = []
    try {
      recentLogs = await prisma.eventLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      })
    } catch (logsError) {
      console.error("Failed to fetch recent logs:", logsError)
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
      },
      eventLogging: {
        test: testResult,
      },
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        pixelId: log.pixelId,
        eventName: log.eventName,
        status: log.status,
        createdAt: log.createdAt,
      })),
    })
  } catch (error) {
    console.error("Test event logging API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
