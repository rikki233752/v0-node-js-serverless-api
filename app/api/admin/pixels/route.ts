import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Basic auth middleware function
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

// GET: Retrieve pixel configurations (for authentication testing and listing)
export async function GET(request: Request) {
  try {
    // Check authentication first
    const isAuthenticated = await authenticate(request)
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

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

    // Get all pixel configurations
    const pixels = await prisma.pixelConfig.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      pixels,
      message: "Authentication successful",
    })
  } catch (error) {
    console.error("Error retrieving pixel configurations:", error)
    return NextResponse.json({ success: false, error: "Failed to retrieve pixel configurations" }, { status: 500 })
  }
}

// POST: Add new pixel configuration
export async function POST(request: Request) {
  try {
    // Check authentication
    const isAuthenticated = await authenticate(request)
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

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

    const { name, clientId, pixelId, accessToken } = await request.json()

    // Validate required fields
    if (!pixelId || !accessToken) {
      return NextResponse.json({ success: false, error: "Pixel ID and Access Token are required" }, { status: 400 })
    }

    // Check if pixel already exists
    const existingPixel = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    if (existingPixel) {
      return NextResponse.json({ success: false, error: "Pixel ID already exists" }, { status: 400 })
    }

    // Create new pixel configuration
    const newPixel = await prisma.pixelConfig.create({
      data: {
        id: `pixel_${Date.now()}`,
        pixelId,
        accessToken,
        name: name || `Pixel ${pixelId}`,
        clientId: clientId || null,
      },
    })

    return NextResponse.json({
      success: true,
      pixel: newPixel,
      message: "Pixel configuration added successfully",
    })
  } catch (error) {
    console.error("Error adding pixel configuration:", error)
    return NextResponse.json({ success: false, error: "Failed to add pixel configuration" }, { status: 500 })
  }
}

// DELETE: Remove pixel configuration
export async function DELETE(request: Request) {
  try {
    // Check authentication
    const isAuthenticated = await authenticate(request)
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

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

    if (!pixelId) {
      return NextResponse.json({ success: false, error: "Pixel ID is required" }, { status: 400 })
    }

    // Delete the pixel configuration
    await prisma.pixelConfig.delete({
      where: { pixelId },
    })

    return NextResponse.json({
      success: true,
      message: "Pixel configuration deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting pixel configuration:", error)
    return NextResponse.json({ success: false, error: "Failed to delete pixel configuration" }, { status: 500 })
  }
}
