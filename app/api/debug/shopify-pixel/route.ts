import { NextResponse } from "next/server"
import { getShopData } from "@/lib/db-auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    console.log("Shopify pixel debug request for shop:", shop)

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    const shopData = await getShopData(shop)

    if (!shopData) {
      console.log("Shop not found in database:", shop)
      return NextResponse.json({ error: "Shop not found in database" }, { status: 404 })
    }

    console.log("Shop data found:", {
      shop: shopData.shop,
      installed: shopData.installed,
      scopes: shopData.scopes,
      tokenLength: shopData.accessToken?.length,
    })

    // Check if we can access Shopify's API
    try {
      // Get shop info
      console.log("Fetching shop info...")
      const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      console.log("Shop API response status:", shopResponse.status)

      let shopInfo = {}
      if (shopResponse.ok) {
        const shopData = await shopResponse.json()
        shopInfo = shopData.shop || {}
        console.log("Shop info retrieved successfully")
      } else {
        const errorText = await shopResponse.text()
        console.error("Shop API error:", shopResponse.status, errorText)
        shopInfo = { error: `API call failed: ${shopResponse.status}` }
      }

      // Check for Web Pixels
      console.log("Fetching Web Pixels...")
      const pixelsResponse = await fetch(`https://${shop}/admin/api/2023-10/pixels.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      console.log("Pixels API response status:", pixelsResponse.status)

      let pixelsData = { pixels: [] }
      if (pixelsResponse.ok) {
        pixelsData = await pixelsResponse.json()
        console.log("Pixels retrieved:", pixelsData.pixels?.length || 0)
      } else {
        const errorText = await pixelsResponse.text()
        console.error("Pixels API error:", pixelsResponse.status, errorText)
        pixelsData = {
          pixels: [],
          error: `Pixels API failed: ${pixelsResponse.status}`,
          errorDetails: errorText,
        }
      }

      // Check for Customer Events (this might not be available in all plans)
      console.log("Fetching Customer Events...")
      let eventsData = { customer_events: [] }
      try {
        const eventsResponse = await fetch(`https://${shop}/admin/api/2023-10/customer_events.json`, {
          headers: {
            "X-Shopify-Access-Token": shopData.accessToken,
          },
        })

        console.log("Customer Events API response status:", eventsResponse.status)

        if (eventsResponse.ok) {
          eventsData = await eventsResponse.json()
          console.log("Customer events retrieved:", eventsData.customer_events?.length || 0)
        } else {
          const errorText = await eventsResponse.text()
          console.error("Customer Events API error:", eventsResponse.status, errorText)
          eventsData = {
            customer_events: [],
            error: `Customer Events API failed: ${eventsResponse.status}`,
            errorDetails: errorText,
          }
        }
      } catch (eventsError) {
        console.error("Customer Events API exception:", eventsError)
        eventsData = {
          customer_events: [],
          error: "Customer Events API not available",
          errorDetails: eventsError.message,
        }
      }

      return NextResponse.json({
        success: true,
        shop: shopInfo,
        pixels: pixelsData.pixels || [],
        pixelsError: pixelsData.error,
        customerEvents: eventsData.customer_events || [],
        customerEventsError: eventsData.error,
        accessToken: shopData.accessToken.substring(0, 10) + "...",
        scopes: shopData.scopes,
        installed: shopData.installed,
        apiVersionUsed: "2023-10",
        gatewayUrl: process.env.HOST
          ? `${process.env.HOST}/api/track`
          : "https://v0-node-js-serverless-api-lake.vercel.app/api/track",
      })
    } catch (apiError) {
      console.error("Shopify API exception:", apiError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to access Shopify API",
          details: apiError.message,
          shopData: {
            shop: shopData.shop,
            installed: shopData.installed,
            scopes: shopData.scopes,
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error checking Shopify pixel status:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
