import { NextResponse } from "next/server"
import { prisma, executeWithRetry } from "@/lib/db"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Forwarded-For, User-Agent, Origin, Referer",
  "Access-Control-Max-Age": "86400",
}

export async function POST(request: Request) {
  console.log("🔍 [Pixel Detection] Starting pixel detection...")

  try {
    const body = await request.json()
    const { shop, detectedPixels, currentUrl } = body

    console.log("🔍 [Pixel Detection] Request:", { shop, detectedPixels, currentUrl })

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop domain is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    // Clean shop domain
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Look up existing shop configuration
    const shopConfig = await executeWithRetry(async () => {
      return await prisma.shopConfig.findFirst({
        where: {
          OR: [{ shopDomain: cleanShop }, { shopDomain: shop }, { shopDomain: { contains: cleanShop } }],
        },
        include: {
          pixelConfig: true,
        },
      })
    })

    let recommendedPixelId = null
    let configurationStatus = "not_configured"
    let matchStatus = "no_match"

    // If we have detected pixels from the website
    if (detectedPixels && detectedPixels.length > 0) {
      console.log("🎯 [Pixel Detection] Found pixels on website:", detectedPixels)

      // Check if any detected pixel matches our database
      if (shopConfig && shopConfig.pixelConfig) {
        const configuredPixelId = shopConfig.pixelConfig.pixelId
        const matchingPixel = detectedPixels.find((pixel: string) => pixel === configuredPixelId)

        if (matchingPixel) {
          console.log("✅ [Pixel Detection] Perfect match! Website pixel matches database config")
          recommendedPixelId = matchingPixel
          configurationStatus = "configured_and_matched"
          matchStatus = "perfect_match"
        } else {
          console.log("⚠️ [Pixel Detection] Mismatch! Website has different pixel than database")
          recommendedPixelId = detectedPixels[0] // Use first detected pixel
          configurationStatus = "configured_but_mismatched"
          matchStatus = "mismatch"
        }
      } else {
        console.log("🆕 [Pixel Detection] No database config, but found pixel on website")
        recommendedPixelId = detectedPixels[0]
        configurationStatus = "detected_but_not_configured"
        matchStatus = "needs_configuration"
      }
    } else {
      // No pixels detected on website
      if (shopConfig && shopConfig.pixelConfig) {
        console.log("📋 [Pixel Detection] No website pixel, using database config")
        recommendedPixelId = shopConfig.pixelConfig.pixelId
        configurationStatus = "configured_only"
        matchStatus = "database_only"
      } else {
        console.log("❌ [Pixel Detection] No pixels anywhere - needs setup")
        configurationStatus = "not_configured"
        matchStatus = "no_pixels"
      }
    }

    // Log the detection result
    await executeWithRetry(async () => {
      return await prisma.eventLog.create({
        data: {
          pixelId: recommendedPixelId || "unknown",
          eventName: "pixel_detection",
          status: "success",
          payload: JSON.stringify({
            shop: cleanShop,
            detectedPixels,
            configuredPixel: shopConfig?.pixelConfig?.pixelId,
            recommendedPixelId,
            configurationStatus,
            matchStatus,
            currentUrl,
            timestamp: new Date().toISOString(),
          }),
        },
      })
    })

    const response = {
      success: true,
      shop: cleanShop,
      detectedPixels: detectedPixels || [],
      configuredPixel: shopConfig?.pixelConfig?.pixelId || null,
      recommendedPixelId,
      configurationStatus,
      matchStatus,
      hasAccessToken: !!shopConfig?.pixelConfig?.accessToken,
      recommendations: getRecommendations(configurationStatus, matchStatus, detectedPixels, shopConfig),
    }

    console.log("📤 [Pixel Detection] Response:", response)

    return NextResponse.json(response, { headers: corsHeaders })
  } catch (error) {
    console.error("💥 [Pixel Detection] Error:", error)

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

function getRecommendations(configurationStatus: string, matchStatus: string, detectedPixels: any, shopConfig: any) {
  const recommendations = []

  switch (configurationStatus) {
    case "configured_and_matched":
      recommendations.push("✅ Perfect! Your website pixel matches our configuration.")
      recommendations.push("🚀 Events are being tracked correctly.")
      break

    case "configured_but_mismatched":
      recommendations.push("⚠️ Your website has a different pixel than configured in our system.")
      recommendations.push(`🔧 Website pixel: ${detectedPixels[0]}`)
      recommendations.push(`📋 Configured pixel: ${shopConfig?.pixelConfig?.pixelId}`)
      recommendations.push("💡 We'll use the website pixel for better accuracy.")
      break

    case "detected_but_not_configured":
      recommendations.push("🆕 We found a Facebook Pixel on your website!")
      recommendations.push(`🎯 Detected pixel: ${detectedPixels[0]}`)
      recommendations.push("🔧 Contact support to configure this pixel in our system.")
      break

    case "configured_only":
      recommendations.push("📋 Using pixel from our database configuration.")
      recommendations.push("💡 No pixel detected on your website - this is normal for server-side tracking.")
      break

    case "not_configured":
      recommendations.push("❌ No Facebook Pixel found anywhere.")
      recommendations.push("🔧 Contact support to set up Facebook Pixel tracking.")
      break
  }

  return recommendations
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
