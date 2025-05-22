import { NextResponse } from "next/server"
import { testDatabaseConnection, getDatabaseStats } from "@/lib/db-test"

export async function GET(request: Request) {
  try {
    // Test database connection
    const connectionStatus = await testDatabaseConnection()

    if (!connectionStatus.connected) {
      return NextResponse.json(
        {
          success: false,
          error: connectionStatus.error,
          message: "Database connection failed",
        },
        { status: 500 },
      )
    }

    // Get database stats
    const stats = await getDatabaseStats()

    return NextResponse.json({
      success: true,
      connection: connectionStatus,
      stats: stats.stats,
    })
  } catch (error) {
    console.error("Error checking database status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
