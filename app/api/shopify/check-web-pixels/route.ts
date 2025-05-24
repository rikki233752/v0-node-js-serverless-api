import { shopifyAdminClient } from "@/lib/shopify"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const client = shopifyAdminClient()

  const SHOP_INFO_QUERY = `
  query {
    shop {
      id
      name
      myshopifyDomain
      plan {
        displayName
      }
    }
  }
`

  const result = await client.query(SHOP_INFO_QUERY)

  return NextResponse.json({
    success: true,
    shop: result.shop,
    message: "Web Pixels must be checked via Shopify Admin",
    instructions: "Go to Settings > Customer events to see your app's Web Pixel status",
    note: "The webPixels GraphQL field is not available in the current API version",
  })
}
