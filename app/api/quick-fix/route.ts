import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // This is a quick fix specifically for test-rikki-new.myshopify.com
    const shopDomain = "test-rikki-new.myshopify.com"
    const correctPixelConfigId = "pixel_1748102233230"

    console.log(`🔧 Quick fix: Linking ${shopDomain} to pixel config ${correctPixelConfigId}`)

    // Update the shop config to link to the correct pixel config
    const updatedShopConfig = await prisma.shopConfig.update({
      where: {
        shopDomain: shopDomain,
      },
      data: {
        pixelConfigId: correctPixelConfigId,
        gatewayEnabled: true,
      },
      include: {
        pixelConfig: true,
      },
    })

    console.log(`✅ Quick fix successful! Shop now using pixel ID: ${updatedShopConfig.pixelConfig?.pixelId}`)

    return NextResponse.json({
      success: true,
      message: "Quick fix applied successfully",
      shopConfig: updatedShopConfig,
    })
  } catch (error) {
    console.error("💥 Error applying quick fix:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
