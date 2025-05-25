import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Get the shop domain from the query parameter
    const searchParams = request.nextUrl.searchParams
    const shopDomain = searchParams.get("shop")

    if (!shopDomain) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing shop parameter",
        },
        { status: 400 },
      )
    }

    // Find the shop in the database
    const shop = await prisma.shop.findUnique({
      where: {
        domain: shopDomain,
      },
      include: {
        shopConfig: true,
      },
    })

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Shop not found",
          shopDomain,
        },
        { status: 404 },
      )
    }

    // Check if the shop has a pixel configuration
    const hasPixelConfig = !!shop.shopConfig && !!shop.shopConfig.pixelConfigId

    // Get the pixel configuration if it exists
    let pixelConfig = null
    if (hasPixelConfig && shop.shopConfig?.pixelConfigId) {
      pixelConfig = await prisma.pixelConfig.findUnique({
        where: {
          id: shop.shopConfig.pixelConfigId,
        },
      })
    }

    // Get the Web Pixel settings from the database
    const webPixelSettings = await prisma.webPixelSettings.findFirst({
      where: {
        shopId: shop.id,
      },
    })

    // Return the shop and pixel configuration
    return NextResponse.json({
      success: true,
      shop: {
        id: shop.id,
        domain: shop.domain,
        accessToken: shop.accessToken ? "✓ Present" : "✗ Missing",
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt,
      },
      shopConfig: shop.shopConfig
        ? {
            id: shop.shopConfig.id,
            pixelConfigId: shop.shopConfig.pixelConfigId,
            createdAt: shop.shopConfig.createdAt,
            updatedAt: shop.shopConfig.updatedAt,
          }
        : null,
      pixelConfig: pixelConfig
        ? {
            id: pixelConfig.id,
            pixelId: pixelConfig.pixelId,
            pixelName: pixelConfig.pixelName,
            accessToken: pixelConfig.accessToken ? "✓ Present" : "✗ Missing",
            createdAt: pixelConfig.createdAt,
            updatedAt: pixelConfig.updatedAt,
          }
        : null,
      webPixelSettings: webPixelSettings
        ? {
            id: webPixelSettings.id,
            webPixelId: webPixelSettings.webPixelId,
            settings: webPixelSettings.settings,
            createdAt: webPixelSettings.createdAt,
            updatedAt: webPixelSettings.updatedAt,
          }
        : null,
    })
  } catch (error) {
    console.error("Error testing web pixel settings:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test web pixel settings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
