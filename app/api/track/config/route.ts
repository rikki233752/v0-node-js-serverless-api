import { NextResponse } from "next/server"
import { getAccessToken } from "@/lib/pixel-tokens"

export async function POST(request: Request) {
  try {
    const { pixelId, shop, source } = await request.json()

    console.log("🔍 [Config API] Pixel config request:", { pixelId, shop, source })

    if (!pixelId) {
      return NextResponse.json({ success: false, error: "Pixel ID required" }, { status: 400 })
    }

    // Get access token for this pixel ID
    const accessToken = await getAccessToken(pixelId)

    if (!accessToken) {
      console.log("⚠️ [Config API] No access token found for pixel:", pixelId)
      return NextResponse.json({
        success: false,
        error: "Pixel not configured",
        message: `Pixel ID ${pixelId} not found in database. Add it to enable gateway tracking.`,
        pixelId,
        shop,
      })
    }

    console.log("✅ [Config API] Found configuration for pixel:", pixelId)

    return NextResponse.json({
      success: true,
      pixelId,
      accessToken,
      gatewayEnabled: true,
      shop,
      message: "Gateway enabled for this pixel",
    })
  } catch (error) {
    console.error("💥 [Config API] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Handle CORS for Web Pixel requests
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
