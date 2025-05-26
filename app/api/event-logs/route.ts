import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pixelId = searchParams.get("pixelId")
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10)

    // Build the query
    const query: any = {
      take: limit,
      orderBy: { createdAt: "desc" as const },
    }

    // Add pixel ID filter if provided
    if (pixelId) {
      query.where = { pixelId }
    }

    // Fetch the logs
    const logs = await prisma.eventLog.findMany(query)

    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error) {
    console.error("Error fetching event logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
