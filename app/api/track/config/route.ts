import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Shop parameter is required",
        },
        { status: 400, headers: corsHeaders },
      )
    }

    // Clean the shop domain
    const cleanShopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    console.log(`🔍 [Config API] Looking up pixel for shop: ${cleanShopDomain}`)

    // Find the shop configuration with its linked pixel config
    const shopConfig = await prisma.shopConfig.findUnique({
      where: {
        shopDomain: cleanShopDomain,
      },
      include: {
        pixelConfig: true,
      },
    })

    // If shop is configured with a pixel
    if (shopConfig?.pixelConfig) {
      console.log(`✅ [Config API] Found pixel ID ${shopConfig.pixelConfig.pixelId} for shop ${cleanShopDomain}`)
      return NextResponse.json(
        {
          success: true,
          shop: cleanShopDomain,
          pixelId: shopConfig.pixelConfig.pixelId,
          accessToken: shopConfig.pixelConfig.accessToken,
          configurationStatus: "already-present",
        },
        { headers: corsHeaders },
      )
    }

    // If shop exists but no pixel is configured
    if (shopConfig) {
      console.log(`⚠️ [Config API] Shop ${cleanShopDomain} exists but no pixel configured`)
      return NextResponse.json(
        {
          success: true,
          shop: cleanShopDomain,
          pixelId: null,
          configurationStatus: "shop_exists_no_pixel",
          message: "Shop is registered but pixel needs to be configured by admin",
        },
        { headers: corsHeaders },
      )
    }

    // Shop not found at all
    console.log(`❌ [Config API] Shop ${cleanShopDomain} not found in database`)
    return NextResponse.json(
      {
        success: false,
        shop: cleanShopDomain,
        error: "Shop not registered",
      },
      { status: 404, headers: corsHeaders },
    )
  } catch (error) {
    console.error("💥 [Config API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
