import { type NextRequest, NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"
import { shopifyAdmin } from "@/lib/shopify"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop, webPixelId } = body

    if (!shop || !webPixelId) {
      return NextResponse.json({
        success: false,
        error: "Missing shop or webPixelId",
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

    const WEB_PIXEL_DELETE_MUTATION = `
      mutation webPixelDelete($id: ID!) {
        webPixelDelete(id: $id) {
          userErrors {
            code
            field
            message
          }
          deletedWebPixelId
        }
      }
    `

    const result = await client.query(WEB_PIXEL_DELETE_MUTATION, {
      id: webPixelId,
    })

    if (result.webPixelDelete.userErrors && result.webPixelDelete.userErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Web Pixel deletion failed",
        userErrors: result.webPixelDelete.userErrors,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Web Pixel deleted successfully",
      deletedId: result.webPixelDelete.deletedWebPixelId,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
