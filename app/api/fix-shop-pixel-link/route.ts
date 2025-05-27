import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopDomain = searchParams.get("shop") || "test-rikki-new.myshopify.com"
    const pixelId = searchParams.get("pixelId") || "584928510540140"

    // Find the pixel configuration
    const pixelConfig = await prisma.pixelConfig.findFirst({
      where: { pixelId },
    })

    if (!pixelConfig) {
      return NextResponse.json({ error: "Pixel configuration not found" }, { status: 404 })
    }

    // Find the shop configuration
    const shopConfig = await prisma.shopConfig.findUnique({
      where: { shopDomain },
      include: { pixelConfig: true },
    })

    if (!shopConfig) {
      return NextResponse.json({ error: "Shop configuration not found" }, { status: 404 })
    }

    // Update the shop configuration to link to the correct pixel
    const updatedShopConfig = await prisma.shopConfig.update({
      where: { id: shopConfig.id },
      data: { pixelConfigId: pixelConfig.id },
      include: { pixelConfig: true },
    })

    return NextResponse.json({
      success: true,
      message: "Shop pixel link updated successfully",
      previousPixelId: shopConfig.pixelConfig?.pixelId,
      newPixelId: updatedShopConfig.pixelConfig?.pixelId,
      shopDomain: updatedShopConfig.shopDomain,
    })
  } catch (error) {
    console.error("Error fixing shop pixel link:", error)
    return NextResponse.json({ error: "Failed to fix shop pixel link" }, { status: 500 })
  }
}
