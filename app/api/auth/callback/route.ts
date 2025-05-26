import { type NextRequest, NextResponse } from "next/server"
import { validateHmac, getAccessToken } from "@/lib/shopify"
import { storeShopData } from "@/lib/db-auth"
import { activateWebPixel } from "@/lib/shopify-graphql"

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

    // Store shop data in database
    await storeShopData({
      shop,
      accessToken,
      scopes: process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events",
      installed: true,
    })

    console.log("💾 Shop data stored successfully")

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
        console.error("📋 Details:", webPixelResult.details)
        console.error("🔍 User errors:", webPixelResult.userErrors)
        webPixelStatus = "failed"
        webPixelError = webPixelResult.error
      }
    } catch (error) {
      console.error("💥 Exception during Web Pixel activation:", error)
      webPixelStatus = "error"
      webPixelError = error instanceof Error ? error.message : "Unknown error"
    }

    // After OAuth is complete, trigger pixel detection in the background
    // We'll do this asynchronously so it doesn't block the redirect
    setTimeout(async () => {
      try {
        console.log("🔍 Starting background pixel detection for shop:", shop)
        const detectUrl = new URL("/api/detect-pixel", request.url)
        detectUrl.searchParams.set("shop", shop)

        // Make an internal request to detect the pixel
        await fetch(detectUrl.toString())
      } catch (error) {
        console.error("❌ Background pixel detection failed:", error)
      }
    }, 5000) // Wait 5 seconds before attempting detection

    // Create success redirect with detailed status
    const successUrl = new URL("/auth/success", request.url)
    successUrl.searchParams.set("shop", shop)
    successUrl.searchParams.set("status", "connected")
    successUrl.searchParams.set("webPixelStatus", webPixelStatus)

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

    console.log("🏁 Redirecting to success page with Web Pixel status:", webPixelStatus)
    return response
  } catch (error) {
    console.error("💥 OAuth callback error:", error)
    const errorUrl = new URL("/api/auth/error", request.url)
    errorUrl.searchParams.set("error", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.redirect(errorUrl)
  }
}
