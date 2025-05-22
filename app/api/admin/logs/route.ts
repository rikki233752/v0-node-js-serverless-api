import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Basic auth middleware function (same as in pixels route)
async function authenticate(request: Request) {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false
  }

  const base64Credentials = authHeader.split(" ")[1]
  const credentials = Buffer.from(base64Credentials, "base64").toString("ascii")
  const [username, password] = credentials.split(":")

  const validUsername = process.env.ADMIN_USERNAME || "admin"
  const validPassword = process.env.ADMIN_PASSWORD || "password"

  return username === validUsername && password === validPassword
}

// GET: Retrieve event logs
export async function GET(request: Request) {
  try {
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection not configured. Please set the DATABASE_URL environment variable.",
        },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(request.url)
    const pixelId = searchParams.get("pixelId")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const skip = (page - 1) * limit

    // Build query
    const where = pixelId ? { pixelId } : {}

    // Get total count for pagination
    const total = await prisma.eventLog.count({ where })

    // Get logs
    const logs = await prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    })

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error retrieving event logs:", error)
    return NextResponse.json({ success: false, error: "Failed to retrieve event logs" }, { status: 500 })
  }
}
