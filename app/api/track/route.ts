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

// Get the correct pixel ID for a shop
async function getPixelIdForShop(shopDomain: string | null): Promise<string | null> {
  if (!shopDomain) {
    console.log(`⚠️ [Track API] No shop domain provided, cannot get pixel ID`)
    return null
  }

  try {
    // Clean the shop domain
    const cleanShopDomain = shopDomain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    console.log(`🔍 [Track API] Looking up pixel ID for shop: ${cleanShopDomain}`)

    // Find the shop config
    const shopConfig = await prisma.shopConfig.findUnique({
      where: { shopDomain: cleanShopDomain },
      include: { pixelConfig: true },
    })

    if (shopConfig?.pixelConfig?.pixelId) {
      console.log(`✅ [Track API] Found configured pixel ID: ${shopConfig.pixelConfig.pixelId}`)
      return shopConfig.pixelConfig.pixelId
    }

    console.log(`⚠️ [Track API] No pixel configuration found for shop: ${cleanShopDomain}`)
    return null
  } catch (error) {
    console.error(`❌ [Track API] Error looking up pixel ID:`, error)
    return null
  }
}

// Get access token for a pixel ID
async function getAccessTokenForPixel(pixelId: string): Promise<string | null> {
  try {
    const pixelConfig = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    if (pixelConfig?.accessToken) {
      return pixelConfig.accessToken
    }

    console.log(`⚠️ [Track API] No access token found for pixel ID: ${pixelId}`)
    return null
  } catch (error) {
    console.error(`❌ [Track API] Error getting access token:`, error)
    return null
  }
}

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

    const {
      pixelId: sentPixelId,
      event_name,
      event_time = Math.floor(Date.now() / 1000),
      user_data = {},
      custom_data = {},
      shop_domain = null,
    } = body

    console.log(`📥 [Track API] Received ${event_name} event with shop domain: ${shop_domain || "unknown"}`)

    // Validate required fields
    if (!event_name) {
      return NextResponse.json(
        { success: false, error: "event_name is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    // Get the correct pixel ID for this shop
    const pixelId = await getPixelIdForShop(shop_domain)

    if (!pixelId) {
      console.error(`❌ [Track API] No pixel ID found for shop: ${shop_domain}`)

      // Log this failure
      await logEvent(
        "unknown_pixel",
        `${event_name}_no_pixel_found`,
        "error",
        { shop_domain },
        { error: "No pixel configuration found for this shop" },
      )

      return NextResponse.json(
        {
          success: false,
          error: "No pixel configuration found for this shop",
          shop_domain,
        },
        { status: 400, headers: corsHeaders },
      )
    }

    // Generate event ID
    const event_id = crypto.randomUUID()

    // Log the event receipt immediately
    try {
      await logEvent(pixelId, `${event_name}_received`, "received", {
        user_data,
        custom_data,
        shop_domain,
        event_id,
      })
      console.log(`📝 [Track API] Logged event receipt with ID: ${event_id}`)
    } catch (logError) {
      console.error(`❌ [Track API] Failed to log event receipt:`, logError)
      // Continue processing even if logging fails
    }

    // Get the access token for this pixel
    const accessToken = await getAccessTokenForPixel(pixelId)

    if (!accessToken) {
      console.error(`❌ [Track API] No access token found for pixel ID: ${pixelId}`)

      // Log this failure
      await logEvent(pixelId, `${event_name}_no_token`, "error", null, {
        error: "No access token found for this pixel ID",
      })

      return NextResponse.json(
        {
          success: false,
          error: "No access token found for this pixel ID",
          pixelId,
        },
        { status: 400, headers: corsHeaders },
      )
    }

    // Hash user data
    const hashedUserData = hashUserData(user_data)

    // Send to Facebook Conversions API
    const result = await sendToFacebookConversionsAPI(
      pixelId,
      event_name,
      event_time,
      hashedUserData,
      custom_data,
      null, // test_event_code
      accessToken,
      event_id,
      custom_data.event_source_url || DEFAULT_DOMAIN,
    )

    // Log the final result
    try {
      await logEvent(
        pixelId,
        `${event_name}_processed`,
        result.success ? "processed" : "error",
        { success: result.success, event_id },
        result.success ? null : { error: result.error },
      )
    } catch (logError) {
      console.error(`❌ [Track API] Failed to log final result:`, logError)
    }

    return NextResponse.json(
      {
        success: result.success,
        eventId: event_id,
        pixelId,
        shopDomain: shop_domain,
        meta_response: result.success ? result.meta_response : null,
        error: !result.success ? result.error : null,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("💥 [Track API] Error:", error)

    // Try to log the error
    try {
      await logEvent("system", "track_api_error", "error", null, {
        error: error instanceof Error ? error.message : String(error),
      })
    } catch (logError) {
      console.error("💥 [Track API] Failed to log error:", logError)
    }

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
