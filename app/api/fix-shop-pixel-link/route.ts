import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop") || "test-rikki-new.myshopify.com"

    // Get the current shop configuration
    const shopConfig = await prisma.shopConfig.findFirst({
      where: { shopDomain: shop },
      include: { pixelConfig: true },
    })

    if (!shopConfig) {
      return NextResponse.json({ error: "Shop configuration not found" }, { status: 404 })
    }

    // Find the correct pixel configuration
    const correctPixelConfig = await prisma.pixelConfig.findFirst({
      where: { pixelId: "584928510540140" },
    })

    if (!correctPixelConfig) {
      return NextResponse.json({ error: "Correct pixel configuration not found" }, { status: 404 })
    }

    // Update the shop configuration to use the correct pixel
    const updatedShopConfig = await prisma.shopConfig.update({
      where: { id: shopConfig.id },
      data: { pixelConfigId: correctPixelConfig.id },
      include: { pixelConfig: true },
    })

    return NextResponse.json({
      success: true,
      message: "Shop pixel link fixed",
      previousPixelId: shopConfig.pixelConfig?.pixelId || "none",
      newPixelId: updatedShopConfig.pixelConfig?.pixelId || "none",
      shop: updatedShopConfig.shopDomain,
    })
  } catch (error) {
    console.error("Error fixing shop pixel link:", error)
    return NextResponse.json({ error: "Failed to fix shop pixel link" }, { status: 500 })
  }
}
