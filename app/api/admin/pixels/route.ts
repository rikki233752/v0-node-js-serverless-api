import { NextResponse } from "next/server"
import { getAllPixelConfigs, addPixelConfig, removePixelConfig, type PixelConfig } from "@/lib/pixel-tokens"

// Basic auth middleware function
async function authenticate(request: Request) {
  // In production, implement proper authentication
  // This is a simple example using basic auth
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false
  }

  // Extract credentials
  const base64Credentials = authHeader.split(" ")[1]
  const credentials = Buffer.from(base64Credentials, "base64").toString("ascii")
  const [username, password] = credentials.split(":")

  // Check against environment variables or use a hardcoded value for demo
  const validUsername = process.env.ADMIN_USERNAME || "admin"
  const validPassword = process.env.ADMIN_PASSWORD || "password"

  return username === validUsername && password === validPassword
}

// GET: Retrieve all pixel configurations
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

    const configs = await getAllPixelConfigs()

    // Mask the access tokens for security
    const safeConfigs = configs.map((config) => ({
      ...config,
      accessToken:
        config.accessToken.substring(0, 8) + "..." + config.accessToken.substring(config.accessToken.length - 4),
    }))

    return NextResponse.json({ success: true, pixels: safeConfigs })
  } catch (error) {
    console.error("Error retrieving pixel configurations:", error)
    return NextResponse.json({ success: false, error: "Failed to retrieve pixel configurations" }, { status: 500 })
  }
}

// POST: Add a new pixel configuration
export async function POST(request: Request) {
  try {
    // Authenticate request
    const isAuthenticated = await authenticate(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.pixelId || !body.accessToken) {
      return NextResponse.json({ success: false, error: "Pixel ID and Access Token are required" }, { status: 400 })
    }

    const pixelConfig: PixelConfig = {
      pixelId: body.pixelId,
      accessToken: body.accessToken,
      name: body.name || undefined,
      clientId: body.clientId || undefined,
    }

    await addPixelConfig(pixelConfig)

    return NextResponse.json({
      success: true,
      message: "Pixel configuration added successfully",
    })
  } catch (error) {
    console.error("Error adding pixel configuration:", error)
    return NextResponse.json({ success: false, error: "Failed to add pixel configuration" }, { status: 500 })
  }
}

// DELETE: Remove a pixel configuration
export async function DELETE(request: Request) {
  try {
    // Authenticate request
    const isAuthenticated = await authenticate(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pixelId = searchParams.get("pixelId")

    if (!pixelId) {
      return NextResponse.json({ success: false, error: "Pixel ID is required" }, { status: 400 })
    }

    const removed = await removePixelConfig(pixelId)

    if (!removed) {
      return NextResponse.json({ success: false, error: "Pixel configuration not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Pixel configuration removed successfully",
    })
  } catch (error) {
    console.error("Error removing pixel configuration:", error)
    return NextResponse.json({ success: false, error: "Failed to remove pixel configuration" }, { status: 500 })
  }
}
