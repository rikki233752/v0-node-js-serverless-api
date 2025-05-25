import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getShopData } from "@/lib/db-auth"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function POST(request: Request) {
  try {
    const { shop, pixelId, accessToken, pixelName } = await request.json()

    console.log("🎯 [Customer Setup] Setting up pixel for shop:", shop)

    // Validate required fields
    if (!shop || !pixelId || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Shop, Pixel ID, and Access Token are required" },
        { status: 400, headers: corsHeaders },
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

    return NextResponse.json(
      {
        success: true,
        message: "Facebook Pixel configured successfully",
        pixelId: pixelConfig.pixelId,
        shop: cleanShop,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("💥 [Customer Setup] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to configure pixel" },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop parameter required" },
        { status: 400, headers: corsHeaders },
      )
    }

    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Try multiple shop domain variations to find a match
    const shopConfig = await prisma.shopConfig.findFirst({
      where: {
        OR: [
          { shopDomain: shop }, // Exact match
          { shopDomain: cleanShop }, // Cleaned version
          { shopDomain: { equals: shop } }, // Explicit equals
          { shopDomain: { equals: cleanShop } }, // Explicit equals cleaned
          { shopDomain: { contains: shop } }, // Contains original
          { shopDomain: { contains: cleanShop } }, // Contains cleaned
        ],
      },
      include: {
        pixelConfig: true,
      },
    })

    console.log("📋 [Customer Setup] Shop config found:", !!shopConfig)
    if (shopConfig) {
      console.log("📋 [Customer Setup] Found shop domain:", shopConfig.shopDomain)
      console.log("📋 [Customer Setup] Shop ID:", shopConfig.id)
      console.log("🎯 [Customer Setup] Pixel config ID:", shopConfig.pixelConfigId)
      console.log("🎯 [Customer Setup] Pixel config found:", !!shopConfig.pixelConfig)
      console.log("🎯 [Customer Setup] Gateway enabled:", shopConfig.gatewayEnabled)
    }

    if (!shopConfig) {
      // If still not found, let's debug what's in the database
      console.log("❌ [Customer Setup] Shop not found, checking all shops...")
      const allShops = await prisma.shopConfig.findMany({
        select: { shopDomain: true, id: true },
        take: 10,
      })
      console.log("📊 [Customer Setup] All shops in database:", allShops)

      return NextResponse.json(
        {
          success: true,
          configured: false,
          pixelId: null,
          pixelName: null,
          shop: cleanShop,
          configurationStatus: "shop_not_found",
          message: "Shop not found in our system - please reinstall the app",
          debug: {
            searchedFor: [shop, cleanShop],
            allShops: allShops.map((s) => s.shopDomain),
          },
        },
        { headers: corsHeaders },
      )
    }

    // Check if pixel is PROPERLY configured (has access token)
    const isProperlyConfigured =
      shopConfig.pixelConfig &&
      shopConfig.pixelConfig.pixelId &&
      shopConfig.pixelConfig.accessToken &&
      shopConfig.gatewayEnabled

    console.log("✅ [Customer Setup] Is properly configured:", isProperlyConfigured)

    if (isProperlyConfigured) {
      // TRULY configured - has pixel ID AND access token in database
      return NextResponse.json(
        {
          success: true,
          configured: true,
          pixelId: shopConfig.pixelConfig.pixelId,
          pixelName: shopConfig.pixelConfig.name || "Facebook Pixel",
          shop: shopConfig.shopDomain,
          configurationStatus: "fully_configured",
          message: "Pixel is properly configured with access token",
        },
        { headers: corsHeaders },
      )
    } else if (shopConfig.pixelConfigId && shopConfig.pixelConfig && !shopConfig.pixelConfig.accessToken) {
      // Pixel exists but no access token (incomplete configuration)
      console.log("⚠️ [Customer Setup] Pixel exists but missing access token")
      return NextResponse.json(
        {
          success: true,
          configured: false,
          pixelId: shopConfig.pixelConfig.pixelId,
          pixelName: shopConfig.pixelConfig.name,
          shop: shopConfig.shopDomain,
          configurationStatus: "pixel_exists_no_token",
          message: "Pixel found but access token missing - please configure below",
        },
        { headers: corsHeaders },
      )
    } else if (shopConfig.pixelConfigId && !shopConfig.pixelConfig) {
      // PixelConfigId exists but pixel config is missing (orphaned reference)
      console.log("⚠️ [Customer Setup] Orphaned pixel config reference")
      return NextResponse.json(
        {
          success: true,
          configured: false,
          pixelId: null,
          pixelName: null,
          shop: shopConfig.shopDomain,
          configurationStatus: "orphaned_pixel_reference",
          message: "Pixel configuration corrupted - please configure below",
        },
        { headers: corsHeaders },
      )
    } else {
      // Shop exists but no pixel configured
      console.log("⚠️ [Customer Setup] Shop exists but no pixel configured")
      return NextResponse.json(
        {
          success: true,
          configured: false,
          pixelId: null,
          pixelName: null,
          shop: shopConfig.shopDomain,
          configurationStatus: "shop_exists_no_pixel",
          message: "Shop is registered but pixel needs to be configured - please enter your details below",
        },
        { headers: corsHeaders },
      )
    }
  } catch (error) {
    console.error("💥 [Customer Setup] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
