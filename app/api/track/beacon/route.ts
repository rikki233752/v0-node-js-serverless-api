import { NextResponse } from "next/server"
import { logEvent } from "@/lib/event-logger"

// Handle POST requests from sendBeacon
export async function POST(request: Request) {
  console.log("📨 Beacon request received")

  try {
    // Get the raw body text
    const bodyText = await request.text()
    console.log("📦 Beacon body:", bodyText)

    // Try to parse as JSON
    let data
    try {
      data = JSON.parse(bodyText)
    } catch (e) {
      console.error("Failed to parse beacon data as JSON:", e)
      data = { raw: bodyText }
    }

    // Log the event
    await logEvent({
      pixelId: data.pixelId || "864857281256627",
      eventName: data.event_name || "beacon_event",
      eventData: data,
      shopDomain: data.shop_domain || "unknown",
      source: data.source || "beacon",
    })

    // Return success (sendBeacon doesn't care about the response)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing beacon request:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// Add CORS headers
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
