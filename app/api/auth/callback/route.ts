import { type NextRequest, NextResponse } from "next/server"
import { validateHmac, getAccessToken } from "@/lib/shopify"
import { storeShopData } from "@/lib/db-auth"
import { activateWebPixel } from "@/lib/shopify-graphql"
import { prisma } from "@/lib/prisma"

// Function to detect Facebook Pixel ID from a website
async function detectFacebookPixel(shopDomain: string): Promise<string | null> {
  try {
    console.log(`🔍 [OAuth Callback] Attempting to detect Facebook Pixel for ${shopDomain}...`)

    // Construct the shop URL
    const shopUrl = shopDomain.includes("://") ? shopDomain : `https://${shopDomain}`

    console.log(`🌐 [OAuth Callback] Fetching shop homepage: ${shopUrl}`)

    // Fetch the shop's homepage
    const response = await fetch(shopUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      console.error(`❌ [OAuth Callback] Failed to fetch shop homepage: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`✅ [OAuth Callback] Fetched shop homepage (${html.length} bytes)`)

    // Look for Facebook Pixel initialization in the HTML
    // Pattern 1: fbq('init', 'PIXEL_ID')
    const initRegex = /fbq\s*\(\s*['"]init['"],\s*['"](\d+)['"]/
    const initMatch = html.match(initRegex)

    if (initMatch && initMatch[1]) {
      console.log(`🎯 [OAuth Callback] Found Facebook Pixel ID (init pattern): ${initMatch[1]}`)
      return initMatch[1]
    }

    // Pattern 2: https://www.facebook.com/tr?id=PIXEL_ID
    const trRegex = /https:\/\/www\.facebook\.com\/tr\?id=(\d+)/
    const trMatch = html.match(trRegex)

    if (trMatch && trMatch[1]) {
      console.log(`🎯 [OAuth Callback] Found Facebook Pixel ID (tr pattern): ${trMatch[1]}`)
      return trMatch[1]
    }

    // Pattern 3: fbevents.js?v=HASH&id=PIXEL_ID
    const eventsRegex = /fbevents\.js\?.*?id=(\d+)/
    const eventsMatch = html.match(eventsRegex)

    if (eventsMatch && eventsMatch[1]) {
      console.log(`🎯 [OAuth Callback] Found Facebook Pixel ID (fbevents pattern): ${eventsMatch[1]}`)
      return eventsMatch[1]
    }

    console.log(`❓ [OAuth Callback] No Facebook Pixel ID found for ${shopDomain}`)
    return null
  } catch (error) {
    console.error(`💥 [OAuth Callback] Error detecting Facebook Pixel:`, error)
    return null
  }
}

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

    // AUTOMATICALLY ACTIVATE WEB PIXEL WITH DETECTED PIXEL ID
    console.log("🎯 Starting automatic Web Pixel activation...")
    let webPixelStatus = "not_attempted"
    let webPixelError = null
    let webPixelId = null

    try {
      // Use detected pixel ID or fall back to environment variable
      const pixelIdToUse = detectedPixelId || process.env.FACEBOOK_PIXEL_ID || "584928510540140"

      console.log("🔧 Using pixel ID for Web Pixel:", pixelIdToUse)

      // Pass the pixel ID to the activation function
      const webPixelResult = await activateWebPixel(shop, accessToken, pixelIdToUse)

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
