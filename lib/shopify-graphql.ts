import { shopifyAdmin } from "./shopify"

interface WebPixelResult {
  success: boolean
  webPixel?: any
  error?: string
}

export async function activateWebPixel(shop: string, accessToken: string, pixelId?: string): Promise<WebPixelResult> {
  try {
    console.log("🎯 [Web Pixel] Starting Web Pixel activation for shop:", shop)

    // Create admin client
    const client = await shopifyAdmin(shop)

    // Use provided pixel ID or fall back to environment variable
    const facebookPixelId = pixelId || process.env.FACEBOOK_PIXEL_ID || "584928510540140"

    // Prepare Web Pixel settings with the detected/provided pixel ID
    const settings = {
      accountID: facebookPixelId,
      pixelId: facebookPixelId,
      gatewayUrl: `${process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"}/api/track`,
      debug: true,
      timestamp: new Date().toISOString(),
    }

    console.log("🔧 [Web Pixel] Using settings:", settings)

    // Create Web Pixel mutation
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

    const result = await client.query(WEB_PIXEL_CREATE_MUTATION, {
      webPixel: {
        settings: JSON.stringify(settings),
      },
    })

    console.log("📨 [Web Pixel] Creation result:", JSON.stringify(result, null, 2))

    if (result.webPixelCreate.userErrors && result.webPixelCreate.userErrors.length > 0) {
      console.error("⚠️ [Web Pixel] Creation errors:", result.webPixelCreate.userErrors)
      return {
        success: false,
        error: result.webPixelCreate.userErrors[0].message,
      }
    }

    console.log("✅ [Web Pixel] Created successfully")
    return {
      success: true,
      webPixel: result.webPixelCreate.webPixel,
    }
  } catch (error) {
    console.error("💥 [Web Pixel] Error creating Web Pixel:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
