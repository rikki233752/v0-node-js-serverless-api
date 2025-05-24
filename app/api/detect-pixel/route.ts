import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface DetectPixelRequest {
  detectedPixels: string[]
  currentUrl: string
  userAgent: string
}

export async function POST(request: Request) {
  try {
    // Parse request body
    let body: DetectPixelRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
        },
        { status: 400 },
      )
    }

    const { detectedPixels, currentUrl, userAgent } = body

    // Validate required fields
    if (!detectedPixels || !currentUrl || !userAgent) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: detectedPixels, currentUrl, or userAgent",
        },
        { status: 400 },
      )
    }

    // Validate detectedPixels is a non-empty array
    if (!Array.isArray(detectedPixels) || detectedPixels.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "detectedPixels must be a non-empty array",
        },
        { status: 400 },
      )
    }

    // Validate all items in detectedPixels are strings
    if (!detectedPixels.every((pixel) => typeof pixel === "string")) {
      return NextResponse.json(
        {
          success: false,
          error: "All items in detectedPixels must be strings",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Detect Pixel] Searching for pixels: ${detectedPixels.join(", ")}`)
    console.log(`📍 [Detect Pixel] URL: ${currentUrl}`)
    console.log(`🌐 [Detect Pixel] User Agent: ${userAgent}`)

    // Query PixelConfig table for a match
    const pixelConfig = await prisma.pixelConfig.findFirst({
      where: {
        pixelId: {
          in: detectedPixels,
        },
      },
    })

    // If no match found, return 404
    if (!pixelConfig) {
      console.log(`❌ [Detect Pixel] No matching pixel found for: ${detectedPixels.join(", ")}`)

      return NextResponse.json(
        {
          success: false,
          error: "Pixel ID not registered in admin database",
          detectedPixels,
        },
        { status: 404 },
      )
    }

    console.log(`✅ [Detect Pixel] Found matching pixel: ${pixelConfig.pixelId}`)

    // Return successful match
    return NextResponse.json({
      success: true,
      recommendedPixelId: pixelConfig.pixelId,
      accessToken: pixelConfig.accessToken,
      hasAccessToken: true,
      matchStatus: "exact",
      configurationStatus: "already-present",
    })
  } catch (error) {
    console.error("❌ [Detect Pixel] Internal server error:", error)

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes("P2021")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database table does not exist",
          },
          { status: 500 },
        )
      }
      if (error.message.includes("P2002")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database constraint violation",
          },
          { status: 500 },
        )
      }
    }

    // Generic internal server error
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

// Optionally handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Use POST.",
    },
    { status: 405 },
  )
}
