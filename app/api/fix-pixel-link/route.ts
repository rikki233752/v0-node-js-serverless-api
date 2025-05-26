import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop") || "test-rikki-new.myshopify.com"
    const pixelConfigId = searchParams.get("pixelConfigId") || "pixel_1748102233230"

    // Clean the shop domain
    const cleanShopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    console.log(`🔧 Fixing pixel link for shop: ${cleanShopDomain}`)
    console.log(`🔧 Setting pixelConfigId to: ${pixelConfigId}`)

    // Update the shop config to link to the correct pixel config
    const updatedShopConfig = await prisma.shopConfig.update({
      where: {
        shopDomain: cleanShopDomain,
      },
      data: {
        pixelConfigId: pixelConfigId,
        gatewayEnabled: true,
      },
      include: {
        pixelConfig: true,
      },
    })

    console.log(`✅ Successfully updated shop config. Now using pixel ID: ${updatedShopConfig.pixelConfig?.pixelId}`)

    return NextResponse.json({
      success: true,
      message: "Shop configuration updated successfully",
      shopConfig: updatedShopConfig,
    })
  } catch (error) {
    console.error("💥 Error fixing pixel link:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
