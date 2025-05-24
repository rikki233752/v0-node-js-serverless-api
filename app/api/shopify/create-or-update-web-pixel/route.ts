import { type NextRequest, NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"
import { shopifyAdmin } from "@/lib/shopify"

export async function POST(request: NextRequest) {
  try {
    console.log("🎯 [Create/Update Web Pixel] Starting...")

    const body = await request.json()
    const { shop, accountID } = body

    console.log("📝 [Create/Update Web Pixel] Request:", { shop, accountID })

    if (!shop || !accountID) {
      console.log("❌ [Create/Update Web Pixel] Missing required fields")
      return NextResponse.json({
        success: false,
        error: "Missing shop or accountID",
        details: "Both shop and accountID are required",
      })
    }

    // Get access token
    console.log("🔍 [Create/Update Web Pixel] Getting access token...")
    const accessToken = await getShopAccessToken(shop)

    if (!accessToken) {
      console.log("❌ [Create/Update Web Pixel] No access token found")
      return NextResponse.json({
        success: false,
        error: "Shop not found or no access token",
        details: `No access token found for shop: ${shop}`,
      })
    }

    console.log("✅ [Create/Update Web Pixel] Access token found")

    // Create Shopify client
    console.log("🔧 [Create/Update Web Pixel] Creating Shopify client...")
    const client = await shopifyAdmin(shop)

    // Prepare Web Pixel settings
    const settings = {
      accountID: accountID,
      pixelId: accountID,
      gatewayUrl: `${process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"}/api/track`,
      debug: true,
      timestamp: new Date().toISOString(),
    }

    console.log("🔧 [Create/Update Web Pixel] Settings:", settings)

    // Try to create Web Pixel
    const WEB_PIXEL_CREATE_MUTATION = `
      mutation webPixelCreate($webPixel: WebPixelInput!) {
        webPixelCreate(webPixel: $webPixel) {
          userErrors {
            code
            field
            message
          }
          webPixel {
            settings
            id
          }
        }
      }
    `

    console.log("📡 [Create/Update Web Pixel] Sending GraphQL mutation...")

    const result = await client.query(WEB_PIXEL_CREATE_MUTATION, {
      webPixel: {
        settings: JSON.stringify(settings),
      },
    })

    console.log("📨 [Create/Update Web Pixel] GraphQL result:", JSON.stringify(result, null, 2))

    if (result.webPixelCreate.userErrors && result.webPixelCreate.userErrors.length > 0) {
      const errors = result.webPixelCreate.userErrors
      console.log("⚠️ [Create/Update Web Pixel] User errors:", errors)

      return NextResponse.json({
        success: false,
        error: "Web Pixel creation failed",
        userErrors: errors,
        details: errors.map((e) => `${e.code}: ${e.message}`).join(", "),
      })
    }

    if (result.webPixelCreate.webPixel) {
      console.log("🎉 [Create/Update Web Pixel] Success!")
      return NextResponse.json({
        success: true,
        message: "Web Pixel created successfully",
        webPixel: result.webPixelCreate.webPixel,
        settings: settings,
      })
    }

    console.log("❌ [Create/Update Web Pixel] Unexpected result")
    return NextResponse.json({
      success: false,
      error: "Unexpected result from Shopify",
      details: "No web pixel returned and no errors",
    })
  } catch (error) {
    console.error("💥 [Create/Update Web Pixel] Error:", error)

    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
