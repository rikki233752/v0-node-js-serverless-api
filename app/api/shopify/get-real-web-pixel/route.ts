import { type NextRequest, NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"
import { shopifyAdmin } from "@/lib/shopify"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop, accountID } = body

    if (!shop || !accountID) {
      return NextResponse.json({
        success: false,
        error: "Missing shop or accountID",
      })
    }

    const accessToken = await getShopAccessToken(shop)
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "Shop not found or no access token",
      })
    }

    const client = await shopifyAdmin(shop)

    // First, get the real Web Pixel ID using the simple query
    console.log("🔍 [Get Real Web Pixel] Fetching Web Pixel...")

    const WEB_PIXEL_QUERY = `
      query {
        webPixel {
          id
          settings
        }
      }
    `

    const result = await client.query(WEB_PIXEL_QUERY)

    console.log("📨 [Get Real Web Pixel] Query result:", JSON.stringify(result, null, 2))

    if (!result.webPixel) {
      return NextResponse.json({
        success: false,
        error: "No Web Pixel found",
        message: "The query returned no Web Pixel. Your app might not have one installed yet.",
      })
    }

    const webPixelId = result.webPixel.id
    const currentSettings = result.webPixel.settings

    console.log("✅ [Get Real Web Pixel] Found Web Pixel:", webPixelId)
    console.log("📋 [Get Real Web Pixel] Current settings:", currentSettings)

    // Now update it with the correct settings
    const newSettings = {
      accountID: accountID,
      pixelId: accountID,
      gatewayUrl: `${process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"}/api/track`,
      debug: true,
      timestamp: new Date().toISOString(),
    }

    console.log("🔧 [Get Real Web Pixel] New settings:", newSettings)

    const WEB_PIXEL_UPDATE_MUTATION = `
      mutation webPixelUpdate($id: ID!, $webPixel: WebPixelInput!) {
        webPixelUpdate(id: $id, webPixel: $webPixel) {
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

    console.log("📡 [Get Real Web Pixel] Updating Web Pixel...")

    const updateResult = await client.query(WEB_PIXEL_UPDATE_MUTATION, {
      id: webPixelId,
      webPixel: {
        settings: JSON.stringify(newSettings),
      },
    })

    console.log("📨 [Get Real Web Pixel] Update result:", JSON.stringify(updateResult, null, 2))

    if (updateResult.webPixelUpdate.userErrors && updateResult.webPixelUpdate.userErrors.length > 0) {
      const errors = updateResult.webPixelUpdate.userErrors
      return NextResponse.json({
        success: false,
        error: "Web Pixel update failed",
        webPixelId: webPixelId,
        currentSettings: currentSettings,
        userErrors: errors,
        details: errors.map((e) => `${e.code}: ${e.message}`).join(", "),
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated Web Pixel: ${webPixelId}`,
      webPixelId: webPixelId,
      oldSettings: currentSettings,
      newSettings: JSON.stringify(newSettings),
      updatedWebPixel: updateResult.webPixelUpdate.webPixel,
    })
  } catch (error) {
    console.error("💥 [Get Real Web Pixel] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
