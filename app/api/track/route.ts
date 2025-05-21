import { NextResponse } from "next/server"
import crypto from "crypto"
import axios from "axios"
import { getAccessToken } from "@/lib/pixel-tokens"
import { logEvent } from "@/lib/event-logger"
import { prisma, executeWithRetry } from "@/lib/db"

const gifPixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

// Ensure the CORS headers are properly set in both GET and POST handlers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Forwarded-For, User-Agent",
}

// Default domain for event_source_url if not provided
const DEFAULT_DOMAIN = "https://yourdomain.com"

async function sendToFacebookConversionsAPI(
  pixelId: string,
  event_name: string,
  event_time: number,
  hashedUserData: any,
  custom_data: any,
  test_event_code: string | null,
  accessToken: string,
  event_id: string,
  event_source_url: string,
) {
  // Prepare the event data for Meta's Conversions API
  const eventData = {
    data: [
      {
        event_name,
        event_time,
        event_id,
        event_source_url,
        action_source: "website",
        user_data: hashedUserData,
        custom_data,
        // Add optional fields if available
        ...(custom_data.value && { value: custom_data.value }),
        ...(custom_data.currency && { currency: custom_data.currency }),
        ...(custom_data.content_ids && { content_ids: custom_data.content_ids }),
        ...(custom_data.content_type && { content_type: custom_data.content_type }),
        ...(custom_data.content_name && { content_name: custom_data.content_name }),
        ...(custom_data.content_category && { content_category: custom_data.content_category }),
        ...(custom_data.search_string && { search_string: custom_data.search_string }),
        ...(custom_data.num_items && { num_items: custom_data.num_items }),
        ...(custom_data.order_id && { order_id: custom_data.order_id }),
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

    // Log success to Vercel logs
    console.log("FB CAPI Success", {
      pixelId,
      event_name,
      event_id: eventData.data[0].event_id,
      response: response.data,
    })

    // Log success with event_id and event_source_url
    await logEvent(pixelId, event_name, "success", {
      ...response.data,
      event_id,
      event_source_url,
    })

    return { success: true, meta_response: response.data, event_id }
  } catch (apiError: any) {
    // Extract error details from Facebook's response
    const errorDetails = apiError.response?.data || apiError.message || "Unknown API error"

    // Log error to Vercel logs
    console.error("FB CAPI Error", {
      pixelId,
      event_name,
      event_id,
      error: errorDetails,
    })

    // Log the error with event_id
    await logEvent(pixelId, event_name, "error", null, {
      error: errorDetails,
      event_id,
      event_source_url,
    })

    return { success: false, error: "Error from Facebook API", details: errorDetails, event_id }
  }
}

async function hashUserData(user_data: any) {
  const hashedUserData: Record<string, string> = {}

  // Process standard fields that need hashing
  const fieldsToHash = [
    "em",
    "ph",
    "fn",
    "ln",
    "ct",
    "st",
    "zp",
    "country",
    "external_id",
    "lead_id",
    "dobd",
    "dobm",
    "doby",
  ]

  fieldsToHash.forEach((field) => {
    if (user_data[field]) {
      try {
        const value = String(user_data[field]).trim().toLowerCase()
        hashedUserData[field] = crypto.createHash("sha256").update(value).digest("hex")
      } catch (e) {
        console.error(`Error hashing ${field}:`, e)
      }
    }
  })

  // Handle phone number specially (remove non-digits)
  if (user_data.ph) {
    try {
      const cleanPhone = String(user_data.ph).replace(/\D/g, "")
      hashedUserData.ph = crypto.createHash("sha256").update(cleanPhone).digest("hex")
    } catch (e) {
      console.error("Error hashing phone number:", e)
    }
  }

  // Copy non-hashed fields
  if (user_data.client_user_agent) {
    hashedUserData.client_user_agent = user_data.client_user_agent
  }

  // Copy Facebook browser ID (fbp) and click ID (fbc) without hashing
  if (user_data.fbp) {
    hashedUserData.fbp = user_data.fbp
  }

  if (user_data.fbc) {
    hashedUserData.fbc = user_data.fbc
  }

  // Copy IP address without hashing (Meta will hash it)
  if (user_data.ip_address) {
    hashedUserData.client_ip_address = user_data.ip_address
  }

  return hashedUserData
}

export async function POST(request: Request) {
  console.log("POST request received at /api/track")

  try {
    // Extract headers
    const ip_address = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"
    const user_agent = request.headers.get("user-agent") || ""

    // Log the request headers for debugging
    console.log("Request headers:", {
      "x-forwarded-for": request.headers.get("x-forwarded-for"),
      "user-agent": user_agent,
      "content-type": request.headers.get("content-type"),
    })

    // Parse the request body
    const body = await request.json()

    // Log the request body for debugging
    console.log("Request body:", JSON.stringify(body).substring(0, 200) + "...")

    // Extract data
    const {
      pixelId = process.env.FACEBOOK_PIXEL_ID,
      event_name,
      event_time = Math.floor(Date.now() / 1000),
      user_data = {},
      custom_data = {},
      test_event_code = null,
      event_id = crypto.randomUUID(),
      event_source_url = custom_data.event_source_url || DEFAULT_DOMAIN,
    } = body

    // Add IP and user agent to user_data if not already present
    user_data.ip_address = user_data.ip_address || ip_address
    user_data.client_user_agent = user_data.client_user_agent || user_agent

    // Validate required fields
    if (!pixelId) {
      console.error("Missing pixelId in request")
      return NextResponse.json({ success: false, error: "Pixel ID is required" }, { status: 400, headers: corsHeaders })
    }

    if (!event_name) {
      console.error("Missing event_name in request")
      return NextResponse.json(
        { success: false, error: "Event name is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    // Check if the pixel is configured in our system - WITH RETRY LOGIC
    const isConfigured = await executeWithRetry(async () => {
      return await prisma.pixelConfig.findUnique({
        where: { pixelId },
      })
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
      await logEvent(pixelId, event_name, "error", null, {
        error: errorMessage,
        event_id,
        event_source_url,
      })

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
      event_id,
      event_source_url,
    )

    if (apiResponse.success) {
      return NextResponse.json(
        {
          success: true,
          meta_response: apiResponse.meta_response,
          event_id,
        },
        { headers: corsHeaders },
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Error from Facebook API",
          details: apiResponse.details,
          event_id,
        },
        { status: 500, headers: corsHeaders },
      )
    }
  } catch (error) {
    console.error("Error processing Facebook Pixel event:", error)
    const event_id = crypto.randomUUID()

    // Try to log the error, but don't fail if pixelId is not available
    try {
      if (typeof error === "object" && error !== null && "pixelId" in error) {
        const errorObj = error as any
        await logEvent(errorObj.pixelId || "unknown", errorObj.event_name || "unknown", "error", null, {
          error: error instanceof Error ? error.message : "Unknown error occurred",
          event_id,
        })
      }
    } catch (logError) {
      console.error("Failed to log error event:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        event_id,
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

// Handle GET requests for image pixel method
export async function GET(request: Request) {
  console.log("GET request received at /api/track")

  const { searchParams } = new URL(request.url)
  const dataParam = searchParams.get("d")
  const event_id = crypto.randomUUID()

  // Extract headers
  const ip_address = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"
  const user_agent = request.headers.get("user-agent") || ""

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
    // Log the data parameter for debugging
    console.log("Data parameter received:", dataParam.substring(0, 100) + "...")

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

    // Add IP and user agent to user_data if not already present
    user_data.ip_address = user_data.ip_address || ip_address
    user_data.client_user_agent = user_data.client_user_agent || user_agent

    // Set event_source_url
    const event_source_url = custom_data.event_source_url || (user_data.referer ? user_data.referer : DEFAULT_DOMAIN)

    // Validate required fields
    if (!pixelId || !event_name) {
      console.error("Missing required fields in pixel request:", { pixelId, event_name })
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

    // Check if the pixel is configured in our system - WITH RETRY LOGIC
    const isConfigured = await executeWithRetry(async () => {
      return await prisma.pixelConfig.findUnique({
        where: { pixelId },
      })
    })

    // If not configured and not the default pixel, log warning but still return the image
    if (!isConfigured && pixelId !== process.env.FACEBOOK_PIXEL_ID) {
      console.warn(`Received event for unconfigured Pixel ID: ${pixelId}`)
      await logEvent(pixelId, event_name, "error", null, {
        error: "The provided Pixel ID is not configured in the system",
        event_id,
        event_source_url,
      })

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
      await logEvent(pixelId, event_name, "error", null, {
        error: errorMessage,
        event_id,
        event_source_url,
      })

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
      event_id,
      event_source_url,
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
