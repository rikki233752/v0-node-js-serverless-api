import { type NextRequest, NextResponse } from "next/server"

// Store the last received data from the web pixel
let lastWebPixelData: any = {
  timestamp: new Date().toISOString(),
  message: "No data received yet",
  data: null,
}

export async function GET(request: NextRequest) {
  return NextResponse.json(lastWebPixelData, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Store the received data with timestamp
    lastWebPixelData = {
      timestamp: new Date().toISOString(),
      message: "Data received from web pixel",
      data: data,
    }

    console.log("Web Pixel Debug Data received:", data)

    return NextResponse.json(
      {
        success: true,
        message: "Debug data received",
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    )
  } catch (error) {
    console.error("Error processing web pixel debug data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process data",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  )
}
