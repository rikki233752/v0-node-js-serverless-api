import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface DetectPixelRequest {
  detectedPixels: string[]
  currentUrl: string
  userAgent: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { detectedPixels, currentUrl, userAgent } = body

    console.log("🔍 Incoming detect-pixel request:", { detectedPixels, currentUrl, userAgent })

    if (!Array.isArray(detectedPixels) || detectedPixels.length === 0) {
      return NextResponse.json({ success: false, error: "Missing or invalid detectedPixels" }, { status: 400 })
    }

    const match = await prisma.pixelConfig.findFirst({
      where: {
        pixelId: { in: detectedPixels },
      },
    })

    console.log("🧠 DB match result:", match)

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: "Pixel ID not registered in admin database",
          detectedPixels,
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      recommendedPixelId: match.pixelId,
      accessToken: match.accessToken,
      hasAccessToken: true,
      matchStatus: "exact",
      configurationStatus: "already-present",
    })
  } catch (err) {
    console.error("❌ Detect Pixel Error:", err)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
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
