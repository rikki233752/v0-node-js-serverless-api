import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

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
        { success: false, error: "Shop parameter is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    console.log(`🔍 [Config API] Getting pixel ID for shop: ${shop}`)

    // Clean the shop domain
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Get shop config from database
    const shopConfig = await prisma.shopConfig.findUnique({
      where: { shopDomain: cleanShop },
      include: { pixelConfig: true },
    })

    if (!shopConfig) {
      console.log(`❌ [Config API] Shop not registered: ${cleanShop}`)
      return NextResponse.json({ success: false, error: "Shop not registered" }, { status: 404, headers: corsHeaders })
    }

    if (shopConfig.pixelConfig) {
      console.log(`✅ [Config API] Found pixel ID for shop ${cleanShop}: ${shopConfig.pixelConfig.pixelId}`)

      return NextResponse.json(
        {
          success: true,
          shop: cleanShop,
          pixelId: shopConfig.pixelConfig.pixelId,
          accessToken: shopConfig.pixelConfig.accessToken,
          configurationStatus: "already-present",
        },
        { headers: corsHeaders },
      )
    } else {
      console.log(`⚠️ [Config API] Shop exists but no pixel configured: ${cleanShop}`)

      return NextResponse.json(
        {
          success: true,
          shop: cleanShop,
          pixelId: null,
          configurationStatus: "shop_exists_no_pixel",
          message: "Shop is registered but pixel needs to be configured by admin",
        },
        { headers: corsHeaders },
      )
    }
  } catch (error) {
    console.error("💥 [Config API] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
