import { NextResponse } from "next/server"

// Store the latest data from the Web Pixel
let latestData: any = null

export async function GET() {
  return NextResponse.json(
    latestData || {
      timestamp: new Date().toISOString(),
      message: "No data received yet from Web Pixel extension",
    },
  )
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Store the latest data
    latestData = {
      ...data,
      timestamp: new Date().toISOString(),
    }

    console.log("Received Web Pixel debug data:", data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Web Pixel debug data:", error)
    return NextResponse.json({ error: "Failed to process data" }, { status: 400 })
  }
}
