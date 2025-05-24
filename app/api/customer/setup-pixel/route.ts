import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    console.log("🔍 [Customer Setup] Checking configuration for shop:", shop)

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop parameter is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    // Clean shop domain
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    console.log("🏪 [Customer Setup] Looking up shop:", cleanShop)

    // Look up shop configuration in database
    const shopConfig = await prisma.shopConfig.findFirst({
      where: {
        OR: [{ shopDomain: cleanShop }, { shopDomain: shop }, { shopDomain: { contains: cleanShop } }],
      },
      include: {
        pixelConfig: true,
      },
    })

    console.log("📋 [Customer Setup] Shop config found:", !!shopConfig)
    console.log("🎯 [Customer Setup] Pixel config found:", !!shopConfig?.pixelConfig)

    // Check if pixel is PROPERLY configured (has access token)
    const isProperlyConfigured =
      shopConfig &&
      shopConfig.pixelConfig &&
      shopConfig.pixelConfig.pixelId &&
      shopConfig.pixelConfig.accessToken &&
      shopConfig.gatewayEnabled

    console.log("✅ [Customer Setup] Is properly configured:", isProperlyConfigured)

    if (isProperlyConfigured) {
      // TRULY configured - has pixel ID AND access token in database
      return NextResponse.json(
        {
          success: true,
          configured: true,
          pixelId: shopConfig.pixelConfig.pixelId,
          pixelName: shopConfig.pixelConfig.name || "Facebook Pixel",
          shop: cleanShop,
          configurationStatus: "fully_configured",
          message: "Pixel is properly configured with access token",
        },
        { headers: corsHeaders },
      )
    } else if (shopConfig && !shopConfig.pixelConfig) {
      // Shop exists but no pixel configured
      console.log("⚠️ [Customer Setup] Shop exists but no pixel configured")
      return NextResponse.json(
        {
          success: true,
          configured: false,
          pixelId: null,
          pixelName: null,
          shop: cleanShop,
          configurationStatus: "shop_exists_no_pixel",
          message: "Shop is registered but pixel needs to be configured by admin",
        },
        { headers: corsHeaders },
      )
    } else if (shopConfig && shopConfig.pixelConfig && !shopConfig.pixelConfig.accessToken) {
      // Pixel exists but no access token (incomplete configuration)
      console.log("⚠️ [Customer Setup] Pixel exists but missing access token")
      return NextResponse.json(
        {
          success: true,
          configured: false,
          pixelId: shopConfig.pixelConfig.pixelId,
          pixelName: shopConfig.pixelConfig.name,
          shop: cleanShop,
          configurationStatus: "pixel_exists_no_token",
          message: "Pixel found but access token missing - contact admin to complete setup",
        },
        { headers: corsHeaders },
      )
    } else {
      // Shop not found in database at all
      console.log("❌ [Customer Setup] Shop not found in database")
      return NextResponse.json(
        {
          success: true,
          configured: false,
          pixelId: null,
          pixelName: null,
          shop: cleanShop,
          configurationStatus: "shop_not_found",
          message: "Shop not found in our system - please reinstall the app",
        },
        { headers: corsHeaders },
      )
    }
  } catch (error) {
    console.error("💥 [Customer Setup] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
