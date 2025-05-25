import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { shop } = await request.json()

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop parameter required" }, { status: 400 })
    }

    console.log("🔧 [Debug] Creating shop config for:", shop)

    // Clean shop domain
    const cleanShopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Create shop configuration entry
    const shopConfig = await prisma.shopConfig.upsert({
      where: { shopDomain: cleanShopDomain },
      update: {
        gatewayEnabled: false,
        updatedAt: new Date(),
      },
      create: {
        shopDomain: cleanShopDomain,
        gatewayEnabled: false,
        pixelConfigId: null,
      },
    })

    console.log("✅ [Debug] Shop config created:", shopConfig)

    return NextResponse.json({
      success: true,
      message: "Shop config created successfully",
      shopConfig: shopConfig,
    })
  } catch (error) {
    console.error("💥 [Debug] Error creating shop config:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create shop config",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop parameter required" }, { status: 400 })
    }

    const cleanShopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    const shopConfig = await prisma.shopConfig.findFirst({
      where: {
        OR: [{ shopDomain: cleanShopDomain }, { shopDomain: shop }, { shopDomain: { contains: cleanShopDomain } }],
      },
      include: { pixelConfig: true },
    })

    return NextResponse.json({
      success: true,
      found: !!shopConfig,
      shopConfig: shopConfig,
      searchedFor: cleanShopDomain,
    })
  } catch (error) {
    console.error("💥 [Debug] Error finding shop config:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to find shop config",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
