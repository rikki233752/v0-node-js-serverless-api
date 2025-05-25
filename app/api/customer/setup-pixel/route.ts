import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getShopData } from "@/lib/db-auth"

export async function POST(request: Request) {
  try {
    const { shop, pixelId, accessToken, pixelName } = await request.json()

    console.log("🎯 [Customer Setup] Setting up pixel for shop:", shop)

    // Validate required fields
    if (!shop || !pixelId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Shop, Pixel ID, and Access Token are required" },
        { status: 400 },
      )
    }

    // Verify shop is authenticated
    const shopData = await getShopData(shop)
    if (!shopData || !shopData.installed) {
      return NextResponse.json({ success: false, error: "Shop not found or not installed" }, { status: 404 })
    }

    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Create or update pixel configuration
    const pixelConfig = await prisma.pixelConfig.upsert({
      where: { pixelId: pixelId },
      update: {
        accessToken: accessToken,
        name: pixelName || `${cleanShop} Pixel`,
        updatedAt: new Date(),
      },
      create: {
        pixelId: pixelId,
        accessToken: accessToken,
        name: pixelName || `${cleanShop} Pixel`,
      },
    })

    // Link shop to pixel configuration
    await prisma.shopConfig.update({
      where: { shopDomain: cleanShop },
      data: {
        pixelConfigId: pixelConfig.id,
        gatewayEnabled: true,
        updatedAt: new Date(),
      },
    })

    console.log("✅ [Customer Setup] Pixel configured successfully for:", cleanShop)

    return NextResponse.json({
      success: true,
      message: "Facebook Pixel configured successfully",
      pixelId: pixelConfig.pixelId,
      shop: cleanShop,
    })
  } catch (error) {
    console.error("💥 [Customer Setup] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to configure pixel" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop parameter required" }, { status: 400 })
    }

    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    const shopConfig = await prisma.shopConfig.findUnique({
      where: { shopDomain: cleanShop },
      include: { pixelConfig: true },
    })

    if (!shopConfig) {
      return NextResponse.json({ success: false, error: "Shop configuration not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      configured: !!shopConfig.pixelConfig,
      gatewayEnabled: shopConfig.gatewayEnabled,
      pixelId: shopConfig.pixelConfig?.pixelId || null,
      pixelName: shopConfig.pixelConfig?.name || null,
    })
  } catch (error) {
    console.error("💥 [Customer Setup] Get error:", error)
    return NextResponse.json({ success: false, error: "Failed to get configuration" }, { status: 500 })
  }
}
