import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          message: "Shop parameter is required",
        },
        { status: 400 },
      )
    }

    // Clean shop domain
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Check if shop exists in database
    const shopConfig = await prisma.shopConfig.findUnique({
      where: { shopDomain: cleanShop },
      include: { pixelConfig: true },
    })

    if (!shopConfig) {
      return NextResponse.json({
        success: true,
        shop_exists: false,
        configured: false,
        message: "Shop not found in database",
      })
    }

    // Check if shop has a pixel configuration
    if (!shopConfig.pixelConfigId) {
      return NextResponse.json({
        success: true,
        shop_exists: true,
        configured: false,
        message: "Shop is registered but pixel needs to be configured by admin",
        shop: cleanShop,
        pixelId: null,
        pixelName: null,
      })
    }

    // Return shop and pixel configuration
    return NextResponse.json({
      success: true,
      shop_exists: true,
      configured: true,
      message: "Shop is registered and pixel is configured",
      shop: cleanShop,
      pixelId: shopConfig.pixelConfig?.pixelId || null,
      pixelName: shopConfig.pixelConfig?.name || null,
      gatewayEnabled: shopConfig.gatewayEnabled,
    })
  } catch (error) {
    console.error("Error checking connection status:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error checking connection status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
