import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      // Return all shop configs
      const allConfigs = await prisma.shopConfig.findMany({
        include: {
          pixelConfig: true,
        },
      })

      return NextResponse.json({
        success: true,
        configs: allConfigs,
      })
    }

    // Clean the shop domain
    const cleanShopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Find specific shop config
    const shopConfig = await prisma.shopConfig.findUnique({
      where: {
        shopDomain: cleanShopDomain,
      },
      include: {
        pixelConfig: true,
      },
    })

    // Also find all pixel configs to debug
    const allPixelConfigs = await prisma.pixelConfig.findMany()

    return NextResponse.json({
      success: true,
      shop: cleanShopDomain,
      shopConfig,
      allPixelConfigs,
    })
  } catch (error) {
    console.error("💥 [Debug API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
