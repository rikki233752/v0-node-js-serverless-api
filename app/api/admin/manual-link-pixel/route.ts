import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateAdmin } from "@/lib/db-auth"

export async function POST(request: Request) {
  try {
    const { shop, pixelId, username, password } = await request.json()

    // Authenticate admin
    if (!authenticateAdmin(username, password)) {
      return NextResponse.json({ success: false, error: "Invalid admin credentials" }, { status: 401 })
    }

    if (!shop || !pixelId) {
      return NextResponse.json({ success: false, error: "Shop and pixelId parameters required" }, { status: 400 })
    }

    console.log("🔗 [Admin] Manual pixel linking for shop:", shop, "Pixel ID:", pixelId)

    // Clean shop domain
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Find the shop config
    const shopConfig = await prisma.shopConfig.findFirst({
      where: {
        OR: [{ shopDomain: shop }, { shopDomain: cleanShop }],
      },
    })

    if (!shopConfig) {
      return NextResponse.json({ success: false, error: "Shop not found in database" }, { status: 404 })
    }

    // Check if pixel is already configured
    let pixelConfig = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    if (!pixelConfig) {
      // Create new pixel config
      pixelConfig = await prisma.pixelConfig.create({
        data: {
          pixelId,
          name: `Manually linked: ${cleanShop}`,
          accessToken: null, // Admin needs to add this
        },
      })
      console.log("✅ [Admin] Created new pixel config:", pixelConfig.id)
    }

    // Link shop to pixel config
    await prisma.shopConfig.update({
      where: { id: shopConfig.id },
      data: {
        pixelConfigId: pixelConfig.id,
        gatewayEnabled: !!pixelConfig.accessToken, // Enable if has access token
        updatedAt: new Date(),
      },
    })

    console.log("✅ [Admin] Shop linked to pixel config")

    return NextResponse.json({
      success: true,
      message: "Pixel linked successfully",
      shop: cleanShop,
      pixelId,
      pixelConfigId: pixelConfig.id,
      hasAccessToken: !!pixelConfig.accessToken,
      gatewayEnabled: !!pixelConfig.accessToken,
    })
  } catch (error) {
    console.error("💥 [Admin] Manual linking error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
