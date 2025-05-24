import { NextResponse } from "next/server"
import { shopifyAdmin } from "@/lib/shopify"

const WEB_PIXELS_QUERY = `
  query {
    app {
      installation {
        launchUrl
        activeSubscriptions {
          id
          name
          status
        }
      }
    }
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

export async function GET(request: Request) {
  try {
    const result = await shopifyAdmin.graphql(WEB_PIXELS_QUERY)
    return NextResponse.json({
      success: true,
      shop: result.shop,
      app: result.app,
      message: "Note: Direct webPixels query not available. Use Shopify Admin to check Customer Events.",
      instructions: "Go to Settings > Customer events in your Shopify admin to see Web Pixels.",
    })
  } catch (error: any) {
    console.error("Failed to fetch web pixels", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
