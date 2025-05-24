import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { detectedPixels, currentUrl, userAgent } = body

    // Validate input
    if (!Array.isArray(detectedPixels) || detectedPixels.length === 0) {
      return NextResponse.json({ success: false, error: "Missing or invalid detectedPixels" }, { status: 400 })
    }

    console.log("🔍 Searching for pixels:", detectedPixels)

    // Find a PixelConfig where pixelId is in the detectedPixels array
    const pixelConfig = await prisma.pixelConfig.findFirst({
      where: {
        pixelId: { in: detectedPixels },
      },
    })

    if (!pixelConfig) {
      console.log("❌ No matching pixel found in database")
      return NextResponse.json(
        {
          success: false,
          error: "No matching pixel found",
          detectedPixels,
        },
        { status: 404 },
      )
    }

    console.log("✅ Found matching pixel:", pixelConfig.pixelId)

    // Return successful response
    return NextResponse.json({
      success: true,
      recommendedPixelId: pixelConfig.pixelId,
      accessToken: pixelConfig.accessToken,
      hasAccessToken: true,
      matchStatus: "exact",
      configurationStatus: "already-present",
    })
  } catch (error) {
    console.error("❌ Server Error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
