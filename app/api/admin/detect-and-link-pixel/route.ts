import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateAdmin } from "@/lib/db-auth"

// Function to detect Facebook Pixel on the website
async function detectFacebookPixel(shopDomain: string): Promise<string | null> {
  try {
    console.log("🔍 [Manual Detection] Scanning website for Facebook Pixel:", shopDomain)

    // Try multiple URL variations
    const urlsToTry = [
      `https://${shopDomain}`,
      `https://${shopDomain}/`,
      `https://${shopDomain}/collections/all`,
      `https://${shopDomain}/products`,
    ]

    for (const url of urlsToTry) {
      try {
        console.log("🌐 [Manual Detection] Trying URL:", url)

        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FacebookPixelDetector/1.0)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          timeout: 15000,
          redirect: "follow",
        })

        if (!response.ok) {
          console.log("⚠️ [Manual Detection] URL failed:", url, response.status)
          continue
        }

        const html = await response.text()
        console.log("✅ [Manual Detection] HTML fetched from:", url, "Length:", html.length)

        // Look for Facebook Pixel patterns
        const pixelPatterns = [
          // fbq('init', 'PIXEL_ID')
          /fbq\s*\(\s*['"]init['"],\s*['"](\d+)['"]/gi,
          // Facebook Pixel script with pixel ID
          /facebook\.net\/tr\?id=(\d+)/gi,
          // Meta Pixel patterns
          /meta-pixel['"]\s*content=['"](\d+)['"]/gi,
          // Data-pixel-id attributes
          /data-pixel-id=['"](\d+)['"]/gi,
          // Facebook pixel in script tags
          /_fbp.*?(\d{15,})/gi,
          // Connect.facebook.net patterns
          /connect\.facebook\.net.*?(\d{15,})/gi,
        ]

        const detectedPixels = new Set<string>()

        for (const pattern of pixelPatterns) {
          let match
          while ((match = pattern.exec(html)) !== null) {
            const pixelId = match[1]
            if (pixelId && pixelId.length >= 10) {
              detectedPixels.add(pixelId)
              console.log("🎯 [Manual Detection] Found pixel ID:", pixelId, "via pattern:", pattern.source)
            }
          }
        }

        if (detectedPixels.size > 0) {
          const detectedPixel = Array.from(detectedPixels)[0]
          console.log("✅ [Manual Detection] Pixel detected:", detectedPixel)
          return detectedPixel
        }
      } catch (urlError) {
        console.log("❌ [Manual Detection] Error with URL:", url, urlError.message)
        continue
      }
    }

    console.log("❌ [Manual Detection] No Facebook Pixel found on any URL")
    return null
  } catch (error) {
    console.error("💥 [Manual Detection] Error:", error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { shop, username, password } = await request.json()

    // Authenticate admin
    if (!authenticateAdmin(username, password)) {
      return NextResponse.json({ success: false, error: "Invalid admin credentials" }, { status: 401 })
    }

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop parameter required" }, { status: 400 })
    }

    console.log("🔍 [Admin] Manual pixel detection for shop:", shop)

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
      include: { pixelConfig: true },
    })

    if (!shopConfig) {
      return NextResponse.json({ success: false, error: "Shop not found in database" }, { status: 404 })
    }

    // Detect pixel on website
    const detectedPixelId = await detectFacebookPixel(cleanShop)

    if (!detectedPixelId) {
      return NextResponse.json({
        success: false,
        error: "No Facebook Pixel detected on website",
        shop: cleanShop,
        detectedPixel: null,
      })
    }

    console.log("🎯 [Admin] Detected pixel:", detectedPixelId)

    // Check if pixel is already configured
    let pixelConfig = await prisma.pixelConfig.findUnique({
      where: { pixelId: detectedPixelId },
    })

    if (!pixelConfig) {
      // Create new pixel config
      pixelConfig = await prisma.pixelConfig.create({
        data: {
          pixelId: detectedPixelId,
          name: `Auto-detected: ${cleanShop}`,
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
      message: "Pixel detected and linked successfully",
      shop: cleanShop,
      detectedPixel: detectedPixelId,
      pixelConfigId: pixelConfig.id,
      hasAccessToken: !!pixelConfig.accessToken,
      gatewayEnabled: !!pixelConfig.accessToken,
    })
  } catch (error) {
    console.error("💥 [Admin] Manual detection error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
