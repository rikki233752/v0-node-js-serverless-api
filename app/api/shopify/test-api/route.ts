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

    console.log("Testing Shopify API access for shop:", shop)

    // Test basic shop access
    const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": shopData.accessToken,
      },
    })

    console.log("Shop API test - Status:", shopResponse.status)
    console.log("Shop API test - Headers:", Object.fromEntries(shopResponse.headers.entries()))

    const shopResponseText = await shopResponse.text()
    console.log("Shop API test - Response text:", shopResponseText)

    let shopResult
    try {
      shopResult = JSON.parse(shopResponseText)
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        test: "shop_api",
        status: shopResponse.status,
        error: "Failed to parse shop API response",
        responseText: shopResponseText,
        parseError: parseError.message,
      })
    }

    // Test pixels API access
    const pixelsResponse = await fetch(`https://${shop}/admin/api/2023-10/pixels.json`, {
      headers: {
        "X-Shopify-Access-Token": shopData.accessToken,
      },
    })

    console.log("Pixels API test - Status:", pixelsResponse.status)
    console.log("Pixels API test - Headers:", Object.fromEntries(pixelsResponse.headers.entries()))

    const pixelsResponseText = await pixelsResponse.text()
    console.log("Pixels API test - Response text:", pixelsResponseText)

    let pixelsResult
    try {
      pixelsResult = JSON.parse(pixelsResponseText)
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        test: "pixels_api",
        status: pixelsResponse.status,
        error: "Failed to parse pixels API response",
        responseText: pixelsResponseText,
        parseError: parseError.message,
      })
    }

    return NextResponse.json({
      success: true,
      shopApi: {
        status: shopResponse.status,
        success: shopResponse.ok,
        data: shopResult,
      },
      pixelsApi: {
        status: pixelsResponse.status,
        success: pixelsResponse.ok,
        data: pixelsResult,
      },
      scopes: shopData.scopes,
      accessTokenLength: shopData.accessToken.length,
    })
  } catch (error) {
    console.error("Error testing Shopify API:", error)
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
