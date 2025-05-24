import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // Using the existing prisma client

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { detectedPixels, currentUrl, userAgent } = body

    // ✅ Validate input
    if (!Array.isArray(detectedPixels) || detectedPixels.length === 0) {
      return NextResponse.json({ success: false, error: "Missing or invalid detectedPixels" }, { status: 400 })
    }

    if (!currentUrl) {
      return NextResponse.json({ success: false, error: "Missing currentUrl" }, { status: 400 })
    }

    // Extract shop domain from URL
    let shopDomain
    try {
      const urlObj = new URL(currentUrl)
      shopDomain = urlObj.hostname.toLowerCase()
      console.log("🏪 Extracted shop domain:", shopDomain)
    } catch (error) {
      console.error("❌ Error parsing URL:", error)
      return NextResponse.json({ success: false, error: "Invalid currentUrl format" }, { status: 400 })
    }

    // ✅ First try to match detected pixels with our database
    const pixelMatch = await prisma.pixelConfig.findFirst({
      where: {
        pixelId: { in: detectedPixels },
      },
    })

    // ✅ If pixel is found, check if it's linked to this shop
    if (pixelMatch) {
      console.log("🎯 Found matching pixel in database:", pixelMatch.pixelId)

      // Check if this pixel is linked to the current shop
      const shopConfig = await prisma.shopConfig.findFirst({
        where: {
          shopDomain: shopDomain,
          pixelConfigId: pixelMatch.id,
        },
      })

      if (shopConfig) {
        // Perfect match - shop is already configured with this pixel
        return NextResponse.json({
          success: true,
          shop: shopDomain,
          recommendedPixelId: pixelMatch.pixelId,
          hasAccessToken: !!pixelMatch.accessToken,
          accessToken: pixelMatch.accessToken,
          matchStatus: "exact",
          configurationStatus: "already-present",
        })
      } else {
        // Pixel exists in our system but not linked to this shop
        return NextResponse.json({
          success: true,
          shop: shopDomain,
          recommendedPixelId: pixelMatch.pixelId,
          hasAccessToken: !!pixelMatch.accessToken,
          accessToken: pixelMatch.accessToken,
          matchStatus: "configured",
          configurationStatus: "ready-to-link",
        })
      }
    }

    // ✅ If no pixel match, check if shop exists in our system
    const shopConfig = await prisma.shopConfig.findFirst({
      where: {
        shopDomain: shopDomain,
      },
      include: {
        pixelConfig: true,
      },
    })

    if (shopConfig && shopConfig.pixelConfig) {
      // Shop exists with a different pixel configuration
      return NextResponse.json({
        success: true,
        shop: shopDomain,
        recommendedPixelId: shopConfig.pixelConfig.pixelId,
        hasAccessToken: !!shopConfig.pixelConfig.accessToken,
        accessToken: shopConfig.pixelConfig.accessToken,
        matchStatus: "configured",
        configurationStatus: "ready-to-inject",
      })
    }

    // No match found
    return NextResponse.json(
      {
        success: false,
        shop: shopDomain,
        detectedPixels,
        reason: "No pixel mapped for this shop",
      },
      { status: 404 },
    )
  } catch (error) {
    console.error("❌ Server Error:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
