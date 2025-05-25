import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticateAdmin } from "@/lib/db-auth"

export async function POST(request: Request) {
  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { shopDomain, pixelId, accessToken, pixelName } = await request.json()

    console.log("🔧 [Admin] Configuring pixel for shop:", shopDomain)

    // Validate required fields
    if (!shopDomain || !pixelId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Shop domain, Pixel ID, and Access Token are required" },
        { status: 400 },
      )
    }

    const cleanShop = shopDomain
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

    // Create or update shop configuration
    const shopConfig = await prisma.shopConfig.upsert({
      where: { shopDomain: cleanShop },
      update: {
        pixelConfigId: pixelConfig.id,
        gatewayEnabled: true,
        updatedAt: new Date(),
      },
      create: {
        shopDomain: cleanShop,
        pixelConfigId: pixelConfig.id,
        gatewayEnabled: true,
      },
    })

    console.log("✅ [Admin] Pixel configured successfully for:", cleanShop)

    return NextResponse.json({
      success: true,
      message: "Pixel configured successfully",
      shopDomain: cleanShop,
      pixelId: pixelConfig.pixelId,
      pixelName: pixelConfig.name,
    })
  } catch (error) {
    console.error("💥 [Admin] Error configuring pixel:", error)
    return NextResponse.json({ success: false, error: "Failed to configure pixel" }, { status: 500 })
  }
}

// Get all configured shops
export async function GET(request: Request) {
  try {
    const authResult = await authenticateAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const shops = await prisma.shopConfig.findMany({
      include: {
        pixelConfig: {
          select: {
            pixelId: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      shops: shops.map((shop) => ({
        shopDomain: shop.shopDomain,
        gatewayEnabled: shop.gatewayEnabled,
        pixelId: shop.pixelConfig?.pixelId || null,
        pixelName: shop.pixelConfig?.name || null,
        configuredAt: shop.createdAt,
        lastUpdated: shop.updatedAt,
      })),
    })
  } catch (error) {
    console.error("💥 [Admin] Error getting shops:", error)
    return NextResponse.json({ success: false, error: "Failed to get shops" }, { status: 500 })
  }
}
