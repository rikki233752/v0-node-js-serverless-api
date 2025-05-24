import { NextResponse } from "next/server"
import { getShopData } from "@/lib/db-auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    const shopData = await getShopData(shop)

    if (!shopData) {
      return NextResponse.json({ error: "Shop not found in database" }, { status: 404 })
    }

    // Check if we can access Shopify's API
    try {
      // Get shop info
      const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      const shopInfo = await shopResponse.json()

      // Check for Web Pixels
      const pixelsResponse = await fetch(`https://${shop}/admin/api/2023-10/pixels.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      const pixelsData = await pixelsResponse.json()

      // Check for Customer Events
      const eventsResponse = await fetch(`https://${shop}/admin/api/2023-10/customer_events.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      const eventsData = await eventsResponse.json()

      return NextResponse.json({
        success: true,
        shop: shopInfo.shop || {},
        pixels: pixelsData.pixels || [],
        customerEvents: eventsData.customer_events || [],
        accessToken: shopData.accessToken.substring(0, 10) + "...",
        scopes: shopData.scopes,
        installed: shopData.installed,
      })
    } catch (apiError) {
      return NextResponse.json({
        success: false,
        error: "Failed to access Shopify API",
        details: apiError.message,
        shopData: {
          shop: shopData.shop,
          installed: shopData.installed,
          scopes: shopData.scopes,
        },
      })
    }
  } catch (error) {
    console.error("Error checking Shopify pixel status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
