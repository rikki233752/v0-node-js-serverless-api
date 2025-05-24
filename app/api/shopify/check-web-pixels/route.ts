import { NextResponse } from "next/server"
import { ShopifyGraphQLClient } from "@/lib/shopify-graphql"

const WEB_PIXELS_QUERY = `
  query {
    webPixels(first: 10) {
      edges {
        node {
          id
          settings
        }
      }
    }
  }
`

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Checking Web Pixels for shop:", shop)

    // Create GraphQL client
    const client = await ShopifyGraphQLClient.fromShop(shop)

    // Execute the query
    const result = await client.query(WEB_PIXELS_QUERY)

    console.log("Web Pixels query result:", result)

    const webPixels = result.webPixels.edges.map((edge: any) => edge.node)

    return NextResponse.json({
      success: true,
      webPixels,
      count: webPixels.length,
    })
  } catch (error) {
    console.error("Error checking Web Pixels:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
