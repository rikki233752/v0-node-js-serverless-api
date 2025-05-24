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

    // New settings
    const settings = {
      accountID: accountID,
      pixelId: accountID,
      gatewayUrl: `${process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"}/api/track`,
      debug: true,
      timestamp: new Date().toISOString(),
    }

    console.log("🔧 [Find and Update] Settings:", settings)

    // Try common Web Pixel IDs (this is a brute force approach)
    const commonIds = [
      "gid://shopify/WebPixel/1",
      "gid://shopify/WebPixel/2",
      "gid://shopify/WebPixel/3",
      "gid://shopify/WebPixel/4",
      "gid://shopify/WebPixel/5",
    ]

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

    // Try to update each possible ID
    for (const webPixelId of commonIds) {
      console.log(`🔍 [Find and Update] Trying Web Pixel ID: ${webPixelId}`)

      try {
        const result = await client.query(WEB_PIXEL_UPDATE_MUTATION, {
          id: webPixelId,
          webPixel: {
            settings: JSON.stringify(settings),
          },
        })

        console.log(`📨 [Find and Update] Result for ${webPixelId}:`, result)

        // If no errors, we found the right ID
        if (!result.webPixelUpdate.userErrors || result.webPixelUpdate.userErrors.length === 0) {
          return NextResponse.json({
            success: true,
            message: `Web Pixel updated successfully with ID: ${webPixelId}`,
            webPixel: result.webPixelUpdate.webPixel,
            webPixelId: webPixelId,
          })
        }

        // Check if it's a NOT_FOUND error (expected for wrong IDs)
        const notFoundError = result.webPixelUpdate.userErrors.find((e) => e.code === "NOT_FOUND")
        if (notFoundError) {
          console.log(`⚠️ [Find and Update] ${webPixelId} not found, trying next...`)
          continue
        }

        // Other errors (might be the right ID but different issue)
        console.log(`❌ [Find and Update] Error with ${webPixelId}:`, result.webPixelUpdate.userErrors)
      } catch (error) {
        console.log(`💥 [Find and Update] Exception with ${webPixelId}:`, error)
        continue
      }
    }

    // If we get here, none of the common IDs worked
    return NextResponse.json({
      success: false,
      error: "Could not find existing Web Pixel",
      message: "Tried common Web Pixel IDs but none worked. Please check Shopify admin manually.",
      suggestion: "Go to Settings > Customer events in your Shopify admin to find the Web Pixel ID",
    })
  } catch (error) {
    console.error("💥 [Find and Update] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
