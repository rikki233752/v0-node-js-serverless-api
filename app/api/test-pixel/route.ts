import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAccessToken } from "@/lib/pixel-tokens"
import { logEvent } from "@/lib/event-logger"
import crypto from "crypto"
import axios from "axios"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pixelId = searchParams.get("pixelId")

    if (!pixelId) {
      return NextResponse.json({ success: false, error: "Pixel ID is required" }, { status: 400 })
    }

    // Check if the pixel exists in the database
    const pixelConfig = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    if (!pixelConfig) {
      return NextResponse.json(
        {
          success: false,
          error: "Pixel ID not found in database",
          exists: false,
        },
        { status: 404 },
      )
    }

    // Get recent logs for this pixel
    const recentLogs = await prisma.eventLog.findMany({
      where: { pixelId },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    return NextResponse.json({
      success: true,
      exists: true,
      pixel: {
        id: pixelConfig.id,
        pixelId: pixelConfig.pixelId,
        name: pixelConfig.name || "Unnamed Pixel",
        clientId: pixelConfig.clientId,
        createdAt: pixelConfig.createdAt,
        // Mask the access token for security
        accessToken:
          pixelConfig.accessToken.substring(0, 6) +
          "..." +
          pixelConfig.accessToken.substring(pixelConfig.accessToken.length - 4),
      },
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        eventName: log.eventName,
        status: log.status,
        createdAt: log.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error checking pixel:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pixelId, eventName = "TestEvent" } = body

    if (!pixelId) {
      return NextResponse.json({ success: false, error: "Pixel ID is required" }, { status: 400 })
    }

    // Get the access token for this pixel ID
    const accessToken = await getAccessToken(pixelId)

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No access token found for the provided Pixel ID",
        },
        { status: 400 },
      )
    }

    // Prepare test user data
    const userData = {
      client_user_agent: "Mozilla/5.0 (Test User Agent)",
      client_ip_address: "127.0.0.1",
      em: crypto.createHash("sha256").update("test@example.com").digest("hex"),
    }

    // Prepare the event data for Meta's Conversions API
    const eventData = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: userData,
          custom_data: {
            test_event: true,
            value: 0,
            currency: "USD",
          },
        },
      ],
    }

    try {
      // Send to Facebook Conversions API
      const response = await axios.post(`https://graph.facebook.com/v17.0/${pixelId}/events`, eventData, {
        params: { access_token: accessToken },
      })

      // Log success
      await logEvent(pixelId, eventName, "success", response.data)

      // Get the newly created log
      const newLog = await prisma.eventLog.findFirst({
        where: { pixelId, eventName },
        orderBy: { createdAt: "desc" },
      })

      // Return success
      return NextResponse.json({
        success: true,
        meta_response: response.data,
        log: newLog,
      })
    } catch (apiError: any) {
      // Extract error details from Facebook's response
      const errorDetails = apiError.response?.data || apiError.message || "Unknown API error"

      // Log the error
      await logEvent(pixelId, eventName, "error", null, errorDetails)

      // Get the newly created error log
      const errorLog = await prisma.eventLog.findFirst({
        where: { pixelId, eventName, status: "error" },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json(
        {
          success: false,
          error: "Error from Facebook API",
          details: errorDetails,
          log: errorLog,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error testing pixel:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
