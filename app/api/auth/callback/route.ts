import { type NextRequest, NextResponse } from "next/server"
import { validateHmac, getAccessToken } from "@/lib/shopify"
import { storeShopData } from "@/lib/db-auth"
import { activateWebPixel } from "@/lib/shopify-graphql"
import { prisma } from "@/lib/prisma"

// Enhanced function to detect Facebook Pixel on the website
async function detectFacebookPixel(shopDomain: string): Promise<string | null> {
  try {
    console.log("🔍 [Pixel Detection] Scanning website for Facebook Pixel:", shopDomain)

    // Construct the shop URL
    const shopUrl = shopDomain.includes("://") ? shopDomain : `https://${shopDomain}`

    console.log("🌐 [Pixel Detection] Fetching website:", shopUrl)

    // Fetch the website HTML
    const response = await fetch(shopUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FacebookPixelDetector/1.0)",
      },
      timeout: 10000, // 10 second timeout
    })

    if (!response.ok) {
      console.log("⚠️ [Pixel Detection] Website fetch failed:", response.status)

      // Try with www prefix if original failed
      if (!shopUrl.includes("www.")) {
        const wwwUrl = shopUrl.replace("https://", "https://www.")
        console.log("🔄 [Pixel Detection] Retrying with www prefix:", wwwUrl)

        const wwwResponse = await fetch(wwwUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FacebookPixelDetector/1.0)",
          },
          timeout: 10000,
        })

        if (!wwwResponse.ok) {
          console.log("❌ [Pixel Detection] www prefix fetch also failed:", wwwResponse.status)
          return null
        }

        const wwwHtml = await wwwResponse.text()
        console.log("✅ [Pixel Detection] Website HTML fetched with www prefix, length:", wwwHtml.length)
        return extractPixelFromHtml(wwwHtml)
      }

      return null
    }

    const html = await response.text()
    console.log("✅ [Pixel Detection] Website HTML fetched, length:", html.length)

    return extractPixelFromHtml(html)
  } catch (error) {
    console.error("💥 [Pixel Detection] Error scanning website:", error)
    return null
  }
}

// Helper function to extract pixel ID from HTML
function extractPixelFromHtml(html: string): string | null {
  // Look for Facebook Pixel patterns
  const pixelPatterns = [
    // fbq('init', 'PIXEL_ID')
    /fbq\s*\(\s*['"]init['"],\s*['"](\d+)['"]/gi,
    // Facebook Pixel script with pixel ID
    /facebook\.net\/en_US\/fbevents\.js[^>]+id=(\d+)/gi,
    /facebook\.net\/tr\?id=(\d+)/gi,
    // Meta Pixel patterns
    /meta-pixel['"]\s*content=['"](\d+)['"]/gi,
    // Data-pixel-id attributes
    /data-pixel-id=['"](\d+)['"]/gi,
    // Facebook Pixel in JSON config
    /"facebook_pixel_id"\s*:\s*["'](\d+)["']/gi,
    // GTM pattern
    /gtm["']?\s*:\s*["']?(\d{15,16})["']?/gi,
    // Shopify specific patterns
    /shopify\.analytics\.meta_pixel_id\s*=\s*["'](\d+)["']/gi,
  ]

  const detectedPixels = new Set<string>()

  for (const pattern of pixelPatterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const pixelId = match[1]
      if (pixelId && pixelId.length >= 10) {
        // Facebook Pixel IDs are typically 15+ digits
        detectedPixels.add(pixelId)
        console.log("🎯 [Pixel Detection] Found pixel ID:", pixelId)
      }
    }
  }

  if (detectedPixels.size === 0) {
    console.log("❌ [Pixel Detection] No Facebook Pixel found on website")
    return null
  }

  if (detectedPixels.size > 1) {
    console.log("⚠️ [Pixel Detection] Multiple pixels found:", Array.from(detectedPixels))
    // Return the first one found
    return Array.from(detectedPixels)[0]
  }

  const detectedPixel = Array.from(detectedPixels)[0]
  console.log("✅ [Pixel Detection] Single pixel detected:", detectedPixel)
  return detectedPixel
}

// OAuth callback endpoint
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    // Extract parameters
    const shop = url.searchParams.get("shop")
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const hmac = url.searchParams.get("hmac")

    console.log("🔐 OAuth callback for shop:", shop)

    // Basic validation
    if (!shop || !code || !hmac) {
      const missingParams = []
      if (!shop) missingParams.push("shop")
      if (!code) missingParams.push("code")
      if (!hmac) missingParams.push("hmac")

      console.error("❌ Missing critical parameters:", missingParams)
      const errorUrl = new URL("/api/auth/error", request.url)
      errorUrl.searchParams.set("error", `Missing critical parameters: ${missingParams.join(", ")}`)
      return NextResponse.redirect(errorUrl)
    }

    // Verify HMAC signature from Shopify
    if (!validateHmac(request)) {
      console.error("❌ HMAC validation failed")
      const errorUrl = new URL("/api/auth/error", request.url)
      errorUrl.searchParams.set("error", "Invalid HMAC signature")
      return NextResponse.redirect(errorUrl)
    }

    // Exchange authorization code for access token
    console.log("🔄 Exchanging code for access token...")
    const accessToken = await getAccessToken(shop, code)

    if (!accessToken) {
      throw new Error("Failed to obtain access token from Shopify")
    }

    console.log("✅ Access token received successfully")

    // Store shop data in database FIRST
    await storeShopData({
      shop,
      accessToken,
      scopes: process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events",
      installed: true,
    })

    console.log("💾 Shop data stored successfully")

    // Clean and store the shop domain properly
    const cleanShopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    console.log("🏪 Processing shop domain:", { original: shop, cleaned: cleanShopDomain })

    // DETECT FACEBOOK PIXEL ON THE WEBSITE
    console.log("🔍 Starting Facebook Pixel detection...")
    const detectedPixelId = await detectFacebookPixel(shop)

    let pixelConfigId = null
    let gatewayEnabled = false

    if (detectedPixelId) {
      console.log("🎯 Detected Facebook Pixel ID:", detectedPixelId)

      // Check if this pixel is already configured by admin
      const existingPixelConfig = await prisma.pixelConfig.findUnique({
        where: { pixelId: detectedPixelId },
      })

      if (existingPixelConfig) {
        console.log("✅ Pixel is already configured by admin!")
        pixelConfigId = existingPixelConfig.id
        gatewayEnabled = !!existingPixelConfig.accessToken // Enable if has access token
      } else {
        console.log("⚠️ Pixel detected but not configured by admin yet")
        // Create a placeholder pixel config for admin to complete
        const newPixelConfig = await prisma.pixelConfig.create({
          data: {
            pixelId: detectedPixelId,
            name: `Auto-detected: ${cleanShopDomain}`,
            accessToken: null, // Admin needs to add this
          },
        })
        pixelConfigId = newPixelConfig.id
        gatewayEnabled = false // Will be enabled when admin adds access token
      }
    } else {
      console.log("❌ No Facebook Pixel detected on website")
    }

    // Create shop configuration entry with detected pixel
    try {
      const shopConfig = await prisma.shopConfig.upsert({
        where: { shopDomain: cleanShopDomain },
        update: {
          pixelConfigId: pixelConfigId,
          gatewayEnabled: gatewayEnabled,
          updatedAt: new Date(),
        },
        create: {
          shopDomain: cleanShopDomain,
          pixelConfigId: pixelConfigId,
          gatewayEnabled: gatewayEnabled,
        },
      })
      console.log("✅ [OAuth] Shop config created/updated with pixel:", shopConfig)
    } catch (dbError) {
      console.error("💥 [OAuth] Database error creating shop config:", dbError)
      // Continue with OAuth flow even if this fails
    }

    // AUTOMATICALLY ACTIVATE WEB PIXEL
    console.log("🎯 Starting automatic Web Pixel activation...")
    let webPixelStatus = "not_attempted"
    let webPixelError = null
    let webPixelId = null

    try {
      const webPixelResult = await activateWebPixel(shop, accessToken)

      if (webPixelResult.success) {
        console.log("🎉 Web Pixel activated successfully:", webPixelResult.webPixel?.id)
        webPixelStatus = "success"
        webPixelId = webPixelResult.webPixel?.id
      } else {
        console.error("❌ Web Pixel activation failed:", webPixelResult.error)
        webPixelStatus = "failed"
        webPixelError = webPixelResult.error
      }
    } catch (error) {
      console.error("💥 Exception during Web Pixel activation:", error)
      webPixelStatus = "error"
      webPixelError = error instanceof Error ? error.message : "Unknown error"
    }

    // Create success redirect with detailed status
    const successUrl = new URL("/customer/setup", request.url)
    successUrl.searchParams.set("shop", shop)
    successUrl.searchParams.set("status", "connected")
    successUrl.searchParams.set("webPixelStatus", webPixelStatus)
    successUrl.searchParams.set("detectedPixel", detectedPixelId || "none")

    if (webPixelId) {
      successUrl.searchParams.set("webPixelId", webPixelId)
    }

    if (webPixelError) {
      successUrl.searchParams.set("webPixelError", encodeURIComponent(webPixelError))
    }

    const response = NextResponse.redirect(successUrl)

    // Set cookies
    response.cookies.delete("shopify_nonce")
    response.cookies.set({
      name: "shopify_install_success",
      value: "true",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5,
    })

    response.cookies.set({
      name: "shopify_shop",
      value: shop,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    console.log("🏁 Redirecting to customer setup page")
    console.log("   🎯 Detected Pixel:", detectedPixelId || "none")
    console.log("   ✅ Gateway Enabled:", gatewayEnabled)
    return response
  } catch (error) {
    console.error("💥 OAuth callback error:", error)
    const errorUrl = new URL("/api/auth/error", request.url)
    errorUrl.searchParams.set("error", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.redirect(errorUrl)
  }
}
