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
      return NextResponse.json({
        connected: false,
        message: "Shop not found in database",
      })
    }

    // Test the access token by making a simple API call
    try {
      const response = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      if (response.ok) {
        return NextResponse.json({
          connected: true,
          installed: shopData.installed,
          message: "Connection is active",
          shop: shopData.shop,
        })
      } else {
        // Token might be invalid, mark as disconnected
        return NextResponse.json({
          connected: false,
          installed: shopData.installed,
          message: "Access token is invalid",
          error: `API call failed with status ${response.status}`,
        })
      }
    } catch (apiError) {
      return NextResponse.json({
        connected: false,
        installed: shopData.installed,
        message: "Failed to verify connection",
        error: apiError.message,
      })
    }
  } catch (error) {
    console.error("Error checking connection status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
