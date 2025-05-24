import { type NextRequest, NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"
import { shopifyAdmin } from "@/lib/shopify"

export async function POST(request: NextRequest) {
  try {
    console.log("🎯 [Smart Web Pixel Update] Starting...")

    const body = await request.json()
    const { shop, accountID } = body

    console.log("📝 [Smart Web Pixel Update] Request:", { shop, accountID })

    if (!shop || !accountID) {
      return NextResponse.json({
        success: false,
        error: "Missing shop or accountID",
        details: "Both shop and accountID are required",
      })
    }

    // Get access token
    const accessToken = await getShopAccessToken(shop)
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "Shop not found or no access token",
        details: `No access token found for shop: ${shop}`,
      })
    }

    // Create Shopify client
    const client = await shopifyAdmin(shop)

    // Step 1: Try to find existing Web Pixels by querying the app installation
    console.log("🔍 [Smart Web Pixel Update] Looking for existing Web Pixels...")

    const FIND_WEB_PIXELS_QUERY = `
      query {
        currentAppInstallation {
          id
        }
      }
    `

    const appResult = await client.query(FIND_WEB_PIXELS_QUERY)
    console.log("📱 [Smart Web Pixel Update] App installation:", appResult)

    // Step 2: Since we can't easily list Web Pixels, let's try a different approach
    // We'll try to create, and if it fails with TAKEN, we'll handle the update differently

    const settings = {
      accountID: accountID,
      pixelId: accountID,
      gatewayUrl: `${process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"}/api/track`,
      debug: true,
      timestamp: new Date().toISOString(),
    }

    console.log("🔧 [Smart Web Pixel Update] Settings:", settings)

    // Step 3: Try to create first
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

    console.log("📡 [Smart Web Pixel Update] Trying to create Web Pixel...")

    const createResult = await client.query(WEB_PIXEL_CREATE_MUTATION, {
      webPixel: {
        settings: JSON.stringify(settings),
      },
    })

    console.log("📨 [Smart Web Pixel Update] Create result:", createResult)

    // Step 4: If creation succeeds, we're done
    if (createResult.webPixelCreate.webPixel) {
      return NextResponse.json({
        success: true,
        message: "Web Pixel created successfully",
        webPixel: createResult.webPixelCreate.webPixel,
        action: "created",
      })
    }

    // Step 5: If creation fails with TAKEN, we need to update
    const errors = createResult.webPixelCreate.userErrors || []
    const takenError = errors.find((e) => e.code === "TAKEN")

    if (takenError) {
      console.log("⚠️ [Smart Web Pixel Update] Web Pixel already exists, need to update")

      // For now, let's try a workaround: delete and recreate
      // This is not ideal but might work as a temporary solution

      return NextResponse.json({
        success: false,
        error: "Web Pixel already exists",
        message:
          "A Web Pixel already exists for this app. We need to update it, but the update requires the Web Pixel ID.",
        suggestion: "Please check your Shopify admin at Settings > Customer events to see the existing Web Pixel.",
        details: "To fix this, we need to implement Web Pixel listing or deletion functionality.",
        userErrors: errors,
      })
    }

    // Step 6: Other errors
    return NextResponse.json({
      success: false,
      error: "Web Pixel operation failed",
      userErrors: errors,
      details: errors.map((e) => `${e.code}: ${e.message}`).join(", "),
    })
  } catch (error) {
    console.error("💥 [Smart Web Pixel Update] Error:", error)

    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
