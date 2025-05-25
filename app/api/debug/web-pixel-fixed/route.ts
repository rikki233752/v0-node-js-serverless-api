import { NextResponse } from "next/server"
import { shopifyAdmin } from "@/lib/shopify"
import { getShopAccessToken } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Get shop from query params
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ success: false, error: "Missing shop parameter" }, { status: 400 })
    }

    console.log(`Checking Web Pixel status for shop: ${shop}`)

    // Get access token
    const accessToken = await getShopAccessToken(shop)

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "No access token found for shop" }, { status: 400 })
    }

    // Create Shopify admin client
    const client = shopifyAdmin(shop)

    // Get all web pixels
    const webPixelsResponse = await client.get({
      path: "web_pixels",
    })

    const webPixelsData = await webPixelsResponse.json()

    // Get all script tags
    const scriptTagsResponse = await client.get({
      path: "script_tags",
    })

    const scriptTagsData = await scriptTagsResponse.json()

    return NextResponse.json({
      success: true,
      webPixels: webPixelsData.web_pixels || [],
      scriptTags: scriptTagsData.script_tags || [],
      shop,
    })
  } catch (error) {
    console.error("Error checking Web Pixel status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
