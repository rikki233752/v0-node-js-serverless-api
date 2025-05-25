import { type NextRequest, NextResponse } from "next/server"

// Store the most recent pixel data
let lastPixelData: any = null

export async function GET(request: NextRequest) {
  return NextResponse.json(
    lastPixelData || {
      timestamp: new Date().toISOString(),
      message: "No pixel data received yet",
    },
  )
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Store the data
    lastPixelData = {
      timestamp: new Date().toISOString(),
      ...data,
    }

    console.log("📊 [Web Pixel Debug] Received data:", {
      shop: data.shop,
      configAccountId: data.configAccountId,
      hasConfigData: !!data.configData,
      hasAnalyticsData: !!data.analyticsData,
      detectedPixels: data.detectedPixels?.length || 0,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("💥 [Web Pixel Debug] Error processing data:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 })
  }
}
