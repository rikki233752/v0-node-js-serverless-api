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

    // Query to get a specific webPixel (we need to guess the ID)
    const WEB_PIXEL_QUERY = `
      query webPixel($id: ID!) {
        webPixel(id: $id) {
          id
          settings
        }
      }
    `

    // Try a range of realistic Web Pixel IDs based on the documentation example
    const baseIds = [
      845285844, // From documentation
      845285845,
      845285846,
      845285847,
      845285848,
      // Try some variations around common ranges
      100000000,
      200000000,
      300000000,
      400000000,
      500000000,
      600000000,
      700000000,
      800000000,
      900000000,
    ]

    const foundPixels = []

    for (const baseId of baseIds) {
      // Try a few numbers around each base
      for (let offset = -5; offset <= 5; offset++) {
        const testId = baseId + offset
        const webPixelId = `gid://shopify/WebPixel/${testId}`

        try {
          console.log(`🔍 [Scan] Trying Web Pixel ID: ${webPixelId}`)

          const result = await client.query(WEB_PIXEL_QUERY, {
            id: webPixelId,
          })

          if (result.webPixel) {
            console.log(`✅ [Scan] Found Web Pixel: ${webPixelId}`)
            foundPixels.push({
              id: webPixelId,
              settings: result.webPixel.settings,
            })

            // Try to update this one with correct settings
            const settings = {
              accountID: accountID,
              pixelId: accountID,
              gatewayUrl: `${process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"}/api/track`,
              debug: true,
              timestamp: new Date().toISOString(),
            }

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

            const updateResult = await client.query(WEB_PIXEL_UPDATE_MUTATION, {
              id: webPixelId,
              webPixel: {
                settings: JSON.stringify(settings),
              },
            })

            if (!updateResult.webPixelUpdate.userErrors || updateResult.webPixelUpdate.userErrors.length === 0) {
              return NextResponse.json({
                success: true,
                message: `Found and updated Web Pixel: ${webPixelId}`,
                webPixel: updateResult.webPixelUpdate.webPixel,
                oldSettings: result.webPixel.settings,
                newSettings: JSON.stringify(settings),
              })
            } else {
              return NextResponse.json({
                success: false,
                message: `Found Web Pixel ${webPixelId} but failed to update`,
                webPixel: result.webPixel,
                updateErrors: updateResult.webPixelUpdate.userErrors,
              })
            }
          }
        } catch (error) {
          // Expected for most IDs - they won't exist
          continue
        }
      }
    }

    return NextResponse.json({
      success: false,
      error: "No Web Pixels found",
      message: "Scanned common Web Pixel ID ranges but didn't find any existing Web Pixels",
      foundPixels,
    })
  } catch (error) {
    console.error("💥 [Scan] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
