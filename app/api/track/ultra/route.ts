import { NextResponse } from "next/server"
import { logEvent } from "@/lib/event-logger"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const encodedData = url.searchParams.get("d")

    if (!encodedData) {
      return NextResponse.json({ success: false, error: "Missing data parameter" }, { status: 400 })
    }

    // Decode the data
    const data = JSON.parse(decodeURIComponent(encodedData))

    // Log the event
    await logEvent({
      pixelId: data.pixelId,
      eventName: data.event_name,
      eventData: data.custom_data || {},
      shopDomain: data.custom_data?.shop_domain || "unknown",
      source: "web-pixel-ultra",
    })

    // Return a success response
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing ultra track request:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Add CORS headers to allow requests from any origin
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}
