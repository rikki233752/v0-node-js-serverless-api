import { type NextRequest, NextResponse } from "next/server"
import { validateHmac, getAccessToken } from "@/lib/shopify"
import { storeShopData } from "@/lib/db-auth"
import { activateWebPixel } from "@/lib/shopify-graphql"
import { prisma } from "@/lib/prisma"

// OAuth callback endpoint with pixel ID support
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

    // Extract pixel ID from state if provided
    let pixelId = null
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, "base64").toString())
        pixelId = decodedState.pixelId
        console.log("📊 Pixel ID from state:", pixelId)
      } catch (e) {
        console.log("⚠️ Could not parse state, might be legacy format")
      }
    }

    // Check session storage for pixel ID (fallback)
    if (!pixelId) {
      // In a real implementation, you'd need to pass this through the OAuth flow
      // For now, we'll try to detect it
      console.log("⚠️ No pixel ID in state, will attempt detection")
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

    // Store shop data in database
    await storeShopData({
      shop,
      accessToken,
      scopes: process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events",
      installed: true,
    })

    console.log("💾 Shop data stored successfully")

    // Clean shop domain
    const cleanShopDomain = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Handle pixel configuration
    let pixelConfigId = null
    let gatewayEnabled = false

    if (pixelId) {
      console.log("🎯 Using provided Facebook Pixel ID:", pixelId)

      // Check if this pixel is already configured
      const existingPixelConfig = await prisma.pixelConfig.findUnique({
        where: { pixelId: pixelId },
      })

      if (existingPixelConfig) {
        console.log("✅ Pixel is already configured!")
        pixelConfigId = existingPixelConfig.id
        gatewayEnabled = !!existingPixelConfig.accessToken
      } else {
        console.log("📝 Creating new pixel configuration")
        // Create a new pixel config
        const newPixelConfig = await prisma.pixelConfig.create({
          data: {
            pixelId: pixelId,
            name: `Pixel for ${cleanShopDomain}`,
            accessToken: null, // Customer needs to add this later
          },
        })
        pixelConfigId = newPixelConfig.id
        gatewayEnabled = false
      }
    }

    // Create/update shop configuration
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
      console.log("✅ Shop config created/updated:", shopConfig)
    } catch (dbError) {
      console.error("💥 Database error creating shop config:", dbError)
    }

    // Activate Web Pixel with the provided pixel ID
    console.log("🎯 Starting Web Pixel activation...")
    let webPixelStatus = "not_attempted"
    let webPixelError = null
    let webPixelId = null

    try {
      const webPixelResult = await activateWebPixel(shop, accessToken, pixelId)

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

    // Redirect to customer setup page
    const successUrl = new URL("/customer/setup", request.url)
    successUrl.searchParams.set("shop", shop)
    successUrl.searchParams.set("status", "connected")
    successUrl.searchParams.set("webPixelStatus", webPixelStatus)
    successUrl.searchParams.set("pixelId", pixelId || "none")

    if (webPixelId) {
      successUrl.searchParams.set("webPixelId", webPixelId)
    }

    const response = NextResponse.redirect(successUrl)

    // Set cookies
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
    return response
  } catch (error) {
    console.error("💥 OAuth callback error:", error)
    const errorUrl = new URL("/api/auth/error", request.url)
    errorUrl.searchParams.set("error", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.redirect(errorUrl)
  }
}
