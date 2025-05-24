import { NextResponse } from "next/server"
import { getShopData } from "@/lib/db-auth"

export async function POST(request: Request) {
  try {
    const { shop } = await request.json()

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    const shopData = await getShopData(shop)

    if (!shopData) {
      return NextResponse.json({ error: "Shop not found in database" }, { status: 404 })
    }

    // Register a Web Pixel with Shopify
    const pixelData = {
      pixel: {
        name: "Facebook Pixel Gateway",
        settings: {
          accountID: "facebook-pixel-gateway",
          pixelId: "", // Will be configured later
          gatewayUrl: `${process.env.HOST}/api/track`,
          debug: false,
        },
      },
    }

    const response = await fetch(`https://${shop}/admin/api/2023-10/pixels.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopData.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pixelData),
    })

    const result = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        pixel: result.pixel,
        message: "Web Pixel registered successfully",
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Failed to register Web Pixel",
        details: result,
      })
    }
  } catch (error) {
    console.error("Error registering Web Pixel:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
