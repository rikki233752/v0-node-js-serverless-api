import { NextResponse } from "next/server"
import crypto from "crypto"
import axios from "axios"
import { getAccessToken } from "@/lib/pixel-tokens"
import { logEvent } from "@/lib/event-logger"
import { prisma } from "@/lib/db"

const gifPixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

// Ensure the CORS headers are properly set in both GET and POST handlers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

async function sendToFacebookConversionsAPI(
  pixelId: string,
  event_name: string,
  event_time: number,
  hashedUserData: any,
  custom_data: any,
  test_event_code: string | null,
  accessToken: string,
) {
  // Prepare the event data for Meta's Conversions API
  const eventData = {
    data: [
      {
        event_name,
        event_time,
        action_source: "website",
        user_data: hashedUserData,
        custom_data,
      },
    ],
  }

  // Prepare request parameters
  const params: Record<string, string> = {
    access_token: accessToken,
  }

  // Add test_event_code if provided
  if (test_event_code) {
    params.test_event_code = test_event_code
  }

  try {
    // Send to Facebook Conversions API
    const response = await axios.post(`https://graph.facebook.com/v17.0/${pixelId}/events`, eventData, { params })

    // Log success
    await logEvent(pixelId, event_name, "success", response.data)

    return { success: true, meta_response: response.data }
  } catch (apiError: any) {
    // Extract error details from Facebook's response
    const errorDetails = apiError.response?.data || apiError.message || "Unknown API error"

    // Log the error
    await logEvent(pixelId, event_name, "error", null, errorDetails)

    return { success: false, error: "Error from Facebook API", details: errorDetails }
  }
}

async function hashUserData(user_data: any) {
  const hashedUserData = { ...user_data }

  if (hashedUserData.em) {
    hashedUserData.em = crypto.createHash("sha256").update(hashedUserData.em.trim().toLowerCase()).digest("hex")
  }

  if (hashedUserData.ph) {
    const cleanPhone = hashedUserData.ph.replace(/\D/g, "")
    hashedUserData.ph = crypto.createHash("sha256").update(cleanPhone).digest("hex")
  }
  // Hash other PII fields if present
  ;["fn", "ln", "ct", "st", "zp", "country"].forEach((field) => {
    if (hashedUserData[field]) {
      hashedUserData[field] = crypto
        .createHash("sha256")
        .update(String(hashedUserData[field]).trim().toLowerCase())
        .digest("hex")
    }
  })

  return hashedUserData
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()

    // Extract data
    const {
      pixelId = process.env.FACEBOOK_PIXEL_ID,
      event_name,
      event_time = Math.floor(Date.now() / 1000),
      user_data = {},
      custom_data = {},
      test_event_code = null,
    } = body

    // Validate required fields
    if (!pixelId) {
      return new NextResponse.json(
        { success: false, error: "Pixel ID is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    if (!event_name) {
      return NextResponse.json(
        { success: false, error: "Event name is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    // Check if the pixel is configured in our system
    const isConfigured = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    // If not configured and not the default pixel, reject the request
    if (!isConfigured && pixelId !== process.env.FACEBOOK_PIXEL_ID) {
      console.warn(`Received event for unconfigured Pixel ID: ${pixelId}`)
      return NextResponse.json(
        {
          success: false,
          error: "The provided Pixel ID is not configured in the system",
        },
        { status: 400, headers: corsHeaders },
      )
    }

    // Get the access token for this pixel ID
    const accessToken = await getAccessToken(pixelId)

    if (!accessToken) {
      const errorMessage = `No access token found for Pixel ID: ${pixelId}`
      console.error(errorMessage)

      // Log the error event
      await logEvent(pixelId, event_name, "error", null, errorMessage)

      return NextResponse.json(
        {
          success: false,
          error: "No access token found for the provided Pixel ID",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      )
    }

    const hashedUserData = await hashUserData(user_data)

    const apiResponse = await sendToFacebookConversionsAPI(
      pixelId,
      event_name,
      event_time,
      hashedUserData,
      custom_data,
      test_event_code,
      accessToken,
    )

    if (apiResponse.success) {
      return NextResponse.json(
        {
          success: true,
          meta_response: apiResponse.meta_response,
        },
        { headers: corsHeaders },
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Error from Facebook API",
          details: apiResponse.details,
        },
        { status: 500, headers: corsHeaders },
      )
    }
  } catch (error) {
    console.error("Error processing Facebook Pixel event:", error)

    // Try to log the error, but don't fail if pixelId is not available
    try {
      if (typeof error === "object" && error !== null && "pixelId" in error) {
        const errorObj = error as any
        await logEvent(
          errorObj.pixelId || "unknown",
          errorObj.event_name || "unknown",
          "error",
          null,
          error instanceof Error ? error.message : "Unknown error occurred",
        )
      }
    } catch (logError) {
      console.error("Failed to log error event:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

// Handle GET requests for image pixel method
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dataParam = searchParams.get("d")

  // Return a 1x1 transparent GIF if no data
  if (!dataParam) {
    console.error("No data provided in pixel request")
    return new Response(gifPixel, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }

  try {
    // Make sure the GET handler properly handles URL-encoded data
    const decodedDataParam = decodeURIComponent(dataParam)
    const data = JSON.parse(decodedDataParam)

    // Extract data
    const {
      pixelId = process.env.FACEBOOK_PIXEL_ID,
      event_name,
      event_time = Math.floor(Date.now() / 1000),
      user_data = {},
      custom_data = {},
      test_event_code = null,
    } = data

    // Validate required fields
    if (!pixelId || !event_name) {
      console.error("Missing required fields in pixel request")
      return new Response(gifPixel, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    // Check if the pixel is configured in our system
    const isConfigured = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    // If not configured and not the default pixel, log warning but still return the image
    if (!isConfigured && pixelId !== process.env.FACEBOOK_PIXEL_ID) {
      console.warn(`Received event for unconfigured Pixel ID: ${pixelId}`)
      await logEvent(pixelId, event_name, "error", null, "The provided Pixel ID is not configured in the system")

      // Still return the image to avoid breaking the client page
      return new Response(gifPixel, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    // Get the access token for this pixel ID
    const accessToken = await getAccessToken(pixelId)

    if (!accessToken) {
      const errorMessage = `No access token found for Pixel ID: ${pixelId}`
      console.error(errorMessage)
      await logEvent(pixelId, event_name, "error", null, errorMessage)

      // Still return the image
      return new Response(gifPixel, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    const hashedUserData = await hashUserData(user_data)

    await sendToFacebookConversionsAPI(
      pixelId,
      event_name,
      event_time,
      hashedUserData,
      custom_data,
      test_event_code,
      accessToken,
    )

    // Return a 1x1 transparent GIF
    return new Response(gifPixel, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Error processing pixel data:", error)

    // Return a 1x1 transparent GIF anyway
    return new Response(gifPixel, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
