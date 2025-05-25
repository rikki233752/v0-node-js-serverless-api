import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import axios from "axios"
import { logEvent } from "@/lib/event-logger"
import { prisma } from "@/lib/db"

const gifPixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

// Ensure the CORS headers are properly set in both GET and POST handlers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all origins
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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

// Hash user data for privacy
function hashUserData(userData: any) {
  const hashedData: any = {}

  // Fields that need hashing
  const fieldsToHash = ["em", "ph", "fn", "ln", "ct", "st", "zp", "country"]

  for (const field of fieldsToHash) {
    if (userData[field]) {
      const value = String(userData[field]).trim().toLowerCase()
      hashedData[field] = crypto.createHash("sha256").update(value).digest("hex")
    }
  }

  // Copy non-hashed fields
  if (userData.client_user_agent) hashedData.client_user_agent = userData.client_user_agent
  if (userData.fbp) hashedData.fbp = userData.fbp
  if (userData.fbc) hashedData.fbc = userData.fbc

  return hashedData
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { pixelId, event_name, event_time = Math.floor(Date.now() / 1000), user_data = {}, custom_data = {} } = body

    console.log(`📥 [Track API] Received ${event_name} event for pixel ${pixelId}`)

    // Validate required fields
    if (!pixelId || !event_name) {
      return NextResponse.json(
        { success: false, error: "pixelId and event_name are required" },
        { status: 400, headers: corsHeaders },
      )
    }

    // Validate pixel exists
    const pixelConfig = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    if (!pixelConfig) {
      console.error(`❌ [Track API] Unknown pixel ID: ${pixelId}`)
      return NextResponse.json({ success: false, error: "Invalid pixel ID" }, { status: 400, headers: corsHeaders })
    }

    // Log the event
    const eventLog = await prisma.eventLog.create({
      data: {
        pixelId,
        eventName: event_name,
        status: "received",
        payload: JSON.stringify({ user_data, custom_data }),
      },
    })

    console.log(`📝 [Track API] Logged event ${eventLog.id}`)

    // Hash user data
    const hashedUserData = hashUserData(user_data)

    // Prepare Facebook Conversions API payload
    const fbPayload = {
      data: [
        {
          event_name,
          event_time,
          event_source_url: custom_data.event_source_url || "https://unknown.com",
          action_source: "website",
          user_data: hashedUserData,
          custom_data: {
            value: custom_data.value,
            currency: custom_data.currency || "USD",
            content_ids: custom_data.content_ids,
            content_type: custom_data.content_type,
            content_name: custom_data.content_name,
            content_category: custom_data.content_category,
            num_items: custom_data.num_items,
          },
        },
      ],
    }

    // Forward to Facebook Conversions API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${pixelConfig.accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fbPayload),
      },
    )

    // Update event log status
    await prisma.eventLog.update({
      where: { id: eventLog.id },
      data: { status: "processed" },
    })

    return NextResponse.json({ success: true, eventId: eventLog.id }, { headers: corsHeaders })
  } catch (error) {
    console.error("💥 [Track API] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500, headers: corsHeaders })
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
