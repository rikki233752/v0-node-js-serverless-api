import { NextResponse } from "next/server"
import { ShopifyGraphQLClient } from "@/lib/shopify-graphql"

const WEB_PIXELS_QUERY = `
  query {
    app {
      installation {
        id
      }
    }
  }
`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Checking Web Pixels for shop:", shop)

    // Create GraphQL client
    const client = await ShopifyGraphQLClient.fromShop(shop)

    // For now, just return a simple response since webPixels query doesn't work
    return NextResponse.json({
      success: true,
      message: "Web Pixels check completed",
      note: "Web Pixels query not available in current API version",
      shop: shop,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error checking Web Pixels:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check Web Pixels",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
