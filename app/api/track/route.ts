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
    // Log the request we're about to send for debugging
    console.log("📤 [FB CAPI] Sending request to Facebook:", {
      url: `https://graph.facebook.com/v17.0/${pixelId}/events`,
      pixelId,
      event_name,
      event_id,
      params: { ...params, access_token: "REDACTED" },
      data: eventData,
    })

    // Send to Facebook Conversions API
    const response = await axios.post(`https://graph.facebook.com/v17.0/${pixelId}/events`, eventData, {
      params,
      timeout: 10000, // 10 second timeout
    })

    // Log success to Vercel logs
    console.log("✅ [FB CAPI] Success", {
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
    const errorResponse = apiError.response?.data || {}
    const errorDetails = {
      message: apiError.message || "Unknown API error",
      status: apiError.response?.status,
      statusText: apiError.response?.statusText,
      data: errorResponse,
      error: errorResponse.error,
    }

    // Log error to Vercel logs
    console.error("❌ [FB CAPI] Error", {
      pixelId,
      event_name,
      event_id,
      error: errorDetails,
    })

    // Check for specific error types and provide more helpful messages
    let errorMessage = "Error from Facebook API"
    let errorSolution = null

    if (errorResponse.error) {
      const fbError = errorResponse.error

      // Handle common Facebook API errors
      if (fbError.code === 190) {
        errorMessage = "Invalid or expired access token"
        errorSolution = "The access token for this pixel has expired or is invalid. Please update the access token."
      } else if (fbError.code === 104) {
        errorMessage = "Unsupported request parameter or invalid parameter value"
        errorSolution = "Check the event data format and ensure all required fields are present and valid."
      } else if (fbError.code === 200) {
        errorMessage = "Permission error"
        errorSolution = "The access token doesn't have permission to use the Conversions API for this pixel."
      } else if (fbError.code === 100) {
        if (fbError.error_subcode === 2804050) {
          errorMessage = "Insufficient customer information"
          errorSolution =
            "Facebook requires more customer information to match this event. Add email, phone, or name+location data."
        } else {
          errorMessage = "Invalid parameter"
          errorSolution =
            "One of the parameters in your request is invalid. Check the error details for more information."
        }
      }
    }

    // Log the error with event_id
    await logEvent(pixelId, event_name, "error", null, {
      error: errorDetails,
      message: errorMessage,
      solution: errorSolution,
      event_id,
      event_source_url,
    })

    return {
      success: false,
      error: errorMessage,
      solution: errorSolution,
      details: errorDetails,
      event_id,
    }
  }
}

// Hash user data for privacy
function hashUserData(userData: any) {
  const hashedData: any = {}

  // Fields that need hashing
  const fieldsToHash = ["em", "ph", "fn", "ln", "ct", "st", "zp", "country", "external_id"]

  // Properly hash each field with SHA-256
  for (const field of fieldsToHash) {
    if (userData[field]) {
      // Normalize the value before hashing
      let value = String(userData[field]).trim()

      // Special normalization for email
      if (field === "em") {
        value = value.toLowerCase()
      }

      // Special normalization for phone (remove non-digits)
      if (field === "ph") {
        value = value.replace(/\D/g, "")
      }

      // Hash the value with SHA-256
      hashedData[field] = crypto.createHash("sha256").update(value).digest("hex")
      console.log(`✅ [Track API] Hashed ${field} for privacy`)
    }
  }

  // Copy non-hashed fields
  if (userData.client_user_agent) hashedData.client_user_agent = userData.client_user_agent
  if (userData.fbp) hashedData.fbp = userData.fbp
  if (userData.fbc) hashedData.fbc = userData.fbc

  // If external_id was provided but not in a hashable format, use it directly
  if (userData.external_id && !hashedData.external_id) {
    hashedData.external_id = userData.external_id
  }

  // Ensure we have at least one identifier
  if (Object.keys(hashedData).filter((k) => k !== "client_user_agent").length === 0) {
    // Generate a random external ID as last resort
    const randomId = `shop_visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    hashedData.external_id = crypto.createHash("sha256").update(randomId).digest("hex")
    console.log(`⚠️ [Track API] Added random external ID as fallback`)

    // Add IP address as a fallback
    hashedData.client_ip_address = "REDACTED_IP_ADDRESS"
    hashedData.client_user_agent = userData.client_user_agent || "Mozilla/5.0"
  }

  console.log(`📊 [Track API] User data fields: ${Object.keys(hashedData).join(", ")}`)
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
    console.log(`🔍 [Track API] User data received:`, user_data)

    // Validate required fields
    if (!event_name) {
      return NextResponse.json(
        { success: false, error: "event_name is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    // Get the correct pixel ID for this shop
    const pixelId = (await getPixelIdForShop(shop_domain)) || sentPixelId || "584928510540140"

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

    // Ensure we have a valid event_source_url
    const event_source_url = custom_data.event_source_url || `https://${shop_domain}` || DEFAULT_DOMAIN

    // Add test data if this is a test environment or if user data is empty
    if (
      process.env.NODE_ENV === "development" ||
      Object.keys(user_data).filter((k) => k !== "client_user_agent").length === 0
    ) {
      console.log(`⚠️ [Track API] Adding test user data for development or empty user data`)

      // Add test email if not present
      if (!user_data.em) {
        user_data.em = "test@example.com"
      }

      // Add test phone if not present
      if (!user_data.ph) {
        user_data.ph = "1234567890"
      }

      // Add test name if not present
      if (!user_data.fn) {
        user_data.fn = "Test"
      }

      if (!user_data.ln) {
        user_data.ln = "User"
      }

      // Add test location if not present
      if (!user_data.ct) {
        user_data.ct = "Test City"
      }

      if (!user_data.zp) {
        user_data.zp = "12345"
      }

      console.log(`✅ [Track API] Added test user data:`, {
        em: "test@example.com",
        ph: "1234567890",
        fn: "Test",
        ln: "User",
        ct: "Test City",
        zp: "12345",
      })
    }

    // Hash user data - this is the critical part for Facebook's requirements
    const hashedUserData = hashUserData(user_data)

    // Send to Facebook Conversions API
    const result = await sendToFacebookConversionsAPI(
      pixelId,
      event_name,
      event_time,
      hashedUserData,
      custom_data,
      process.env.FACEBOOK_TEST_EVENT_CODE || null, // Use test event code from env if available
      accessToken,
      event_id,
      event_source_url,
    )

    // Log the final result
    try {
      await logEvent(
        pixelId,
        `${event_name}_processed`,
        result.success ? "processed" : "error",
        { success: result.success, event_id },
        result.success ? null : { error: result.error, solution: result.solution },
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
        solution: !result.success ? result.solution : null,
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
