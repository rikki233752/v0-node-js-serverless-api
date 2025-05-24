import { NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Listing Web Pixels for shop:", shop)

    // Get access token from database
    const accessToken = await getShopAccessToken(shop)
    if (!accessToken) {
      return NextResponse.json({ error: "Shop not found in database or no access token" }, { status: 404 })
    }

    // Use REST Admin API to list Web Pixels
    const response = await fetch(`https://${shop}/admin/api/2023-10/web_pixels.json`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Shopify API error:", response.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Shopify API error: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("Web Pixels REST API response:", data)

    return NextResponse.json({
      success: true,
      webPixels: data.web_pixels || [],
      count: data.web_pixels ? data.web_pixels.length : 0,
      shop: shop,
    })
  } catch (error) {
    console.error("Error listing Web Pixels:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to list Web Pixels",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
