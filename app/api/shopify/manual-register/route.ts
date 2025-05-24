import { NextResponse } from "next/server"
import { storeShopData } from "@/lib/db-auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { shop, accessToken } = body

    if (!shop || !accessToken) {
      return NextResponse.json({ error: "Shop and accessToken are required" }, { status: 400 })
    }

    // Test the access token by making a simple API call
    const testResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    })

    if (!testResponse.ok) {
      return NextResponse.json(
        {
          error: "Invalid access token",
          details: `API test failed with status ${testResponse.status}`,
        },
        { status: 400 },
      )
    }

    const shopInfo = await testResponse.json()

    // Store the shop data
    await storeShopData({
      shop,
      accessToken,
      scopes: process.env.SHOPIFY_SCOPES || "read_orders,write_webhooks",
      installed: true,
    })

    return NextResponse.json({
      success: true,
      message: "Shop registered successfully",
      shopInfo: shopInfo.shop,
    })
  } catch (error) {
    console.error("Manual registration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Registration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
