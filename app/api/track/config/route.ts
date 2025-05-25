import { NextResponse } from "next/server"
import { prisma, executeWithRetry } from "@/lib/db"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Forwarded-For, User-Agent, Origin, Referer",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-cache",
}

export async function POST(request: Request) {
  console.log("📡 [Config API] =================================")
  console.log("📡 [Config API] Received config request")
  console.log("📡 [Config API] Request URL:", request.url)
  console.log("📡 [Config API] Request method:", request.method)
  console.log("📡 [Config API] Request headers:", Object.fromEntries(request.headers.entries()))

  try {
    const body = await request.json()
    console.log("📡 [Config API] Request body:", body)

    const { shop, source } = body

    console.log("🏪 [Config API] Request details:", { shop, source })

    if (!shop || shop === "unknown") {
      console.log("⚠️ [Config API] Invalid shop domain provided")
      return NextResponse.json(
        {
          success: false,
          error: "Valid shop domain is required",
          receivedShop: shop,
          debug: "Shop domain detection failed",
        },
        { status: 400, headers: corsHeaders },
      )
    }

    // Clean shop domain (remove protocol, www, etc.)
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    console.log("🧹 [Config API] Cleaned shop domain:", cleanShop)

    // Look up shop configuration in database
    const shopConfig = await executeWithRetry(async () => {
      return await prisma.shopConfig.findFirst({
        where: {
          OR: [{ shopDomain: cleanShop }, { shopDomain: shop }, { shopDomain: { contains: cleanShop } }],
        },
        include: {
          pixelConfig: true, // Include related pixel configuration
        },
      })
    })

    if (!shopConfig) {
      console.log("❌ [Config API] No shop configuration found for:", cleanShop)

      return NextResponse.json(
        {
          success: false,
          error: "No pixel configuration found for this shop",
          shop: cleanShop,
        },
        { status: 404, headers: corsHeaders },
      )
    }

    console.log("✅ [Config API] Found shop configuration:", {
      shopId: shopConfig.id,
      shopDomain: shopConfig.shopDomain,
      pixelConfigId: shopConfig.pixelConfigId,
    })

    // Get the pixel configuration
    let pixelConfig = shopConfig.pixelConfig

    // If no direct pixel config, try to find one by pixel ID
    if (!pixelConfig && shopConfig.pixelConfigId) {
      pixelConfig = await executeWithRetry(async () => {
        return await prisma.pixelConfig.findUnique({
          where: { id: shopConfig.pixelConfigId },
        })
      })
    }

    if (!pixelConfig) {
      console.log("❌ [Config API] No pixel configuration found for shop")
      return NextResponse.json(
        {
          success: false,
          error: "No pixel configuration found for this shop",
          shop: cleanShop,
        },
        { status: 404, headers: corsHeaders },
      )
    }

    console.log("🎯 [Config API] Found pixel configuration:", {
      pixelId: pixelConfig.pixelId,
      name: pixelConfig.name,
      hasAccessToken: !!pixelConfig.accessToken,
    })

    // Validate that we have an access token for this pixel
    if (!pixelConfig.accessToken) {
      console.log("⚠️ [Config API] Pixel configuration missing access token")
      return NextResponse.json(
        {
          success: false,
          error: "Pixel configuration is incomplete (missing access token)",
          pixelId: pixelConfig.pixelId,
          shop: cleanShop,
        },
        { status: 400, headers: corsHeaders },
      )
    }

    // Return the validated configuration
    const response = {
      success: true,
      pixelId: pixelConfig.pixelId,
      gatewayEnabled: true,
      source: "database",
      shop: cleanShop,
      pixelName: pixelConfig.name,
      configuredAt: shopConfig.createdAt,
      lastUpdated: shopConfig.updatedAt,
    }

    console.log("📤 [Config API] Returning configuration:", response)

    return NextResponse.json(response, { headers: corsHeaders })
  } catch (error) {
    console.error("💥 [Config API] Error processing config request:", error)

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get("shop")

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "Shop parameter is required" },
      { status: 400, headers: corsHeaders },
    )
  }

  // Convert GET to POST format
  return POST(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop, source: "get_request" }),
    }),
  )
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
