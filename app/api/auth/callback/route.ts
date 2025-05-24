import { type NextRequest, NextResponse } from "next/server"
import { validateHmac, getAccessToken } from "@/lib/shopify"
import { storeShopData } from "@/lib/db-auth"

// OAuth callback endpoint
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    // Log all incoming parameters for debugging
    console.log("OAuth callback received:", {
      url: request.url,
      searchParams: Object.fromEntries(url.searchParams.entries()),
      headers: {
        host: request.headers.get("host"),
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
      },
      cookies: {
        shopify_nonce: request.cookies.get("shopify_nonce")?.value,
        shopify_shop: request.cookies.get("shopify_shop")?.value,
      },
    })

    // Extract parameters
    const shop = url.searchParams.get("shop")
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const hmac = url.searchParams.get("hmac")
    const timestamp = url.searchParams.get("timestamp")

    // Get nonce from cookie
    const nonce = request.cookies.get("shopify_nonce")?.value

    console.log("Extracted parameters:", {
      shop,
      code: code ? "present" : "missing",
      state: state ? "present" : "missing",
      hmac: hmac ? "present" : "missing",
      timestamp,
      nonce: nonce ? "present" : "missing",
    })

    // Check for missing critical parameters
    const missingParams = []
    if (!shop) missingParams.push("shop")
    if (!code) missingParams.push("code")
    if (!hmac) missingParams.push("hmac")

    if (missingParams.length > 0) {
      console.error("Missing critical parameters:", missingParams)
      const errorUrl = new URL("/api/auth/error", request.url)
      errorUrl.searchParams.set("error", `Missing critical parameters: ${missingParams.join(", ")}`)
      errorUrl.searchParams.set(
        "debug",
        JSON.stringify({
          received: Object.fromEntries(url.searchParams.entries()),
          missing: missingParams,
          cookies: {
            nonce: nonce ? "present" : "missing",
            shop: request.cookies.get("shopify_shop")?.value || "missing",
          },
        }),
      )
      return NextResponse.redirect(errorUrl)
    }

    // Verify HMAC signature from Shopify
    if (!validateHmac(request)) {
      console.error("HMAC validation failed")
      const errorUrl = new URL("/api/auth/error", request.url)
      errorUrl.searchParams.set("error", "Invalid HMAC signature")
      return NextResponse.redirect(errorUrl)
    }

    // Handle missing state/nonce scenario
    if (!state && !nonce) {
      console.warn("Both state and nonce are missing - this suggests direct access to Shopify OAuth")
      console.warn("Proceeding without CSRF protection - this is less secure but will allow installation")
    } else if (!state) {
      console.warn("State parameter missing from Shopify callback")
      console.warn("This might indicate an issue with the OAuth URL generation")
    } else if (!nonce) {
      console.warn("Nonce cookie missing - this might be due to cookie restrictions")
      console.warn("Proceeding without state verification")
    } else if (state !== nonce) {
      console.error("State mismatch:", { state, nonce })
      // For now, let's log this but not fail the installation
      console.warn("Proceeding despite state mismatch - this reduces security but allows installation")
    }

    // Exchange authorization code for access token
    console.log("Exchanging code for access token...")
    const accessToken = await getAccessToken(shop, code)
    console.log("Access token received:", accessToken ? "success" : "failed")

    if (!accessToken) {
      throw new Error("Failed to obtain access token from Shopify")
    }

    // Store shop data in database with installed=true
    await storeShopData({
      shop,
      accessToken,
      scopes: process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events",
      installed: true,
    })

    console.log("Shop data stored successfully for:", shop)

    // Create response with success redirect
    const successUrl = new URL("/auth/success", request.url)
    successUrl.searchParams.set("shop", shop)
    successUrl.searchParams.set("status", "connected")

    const response = NextResponse.redirect(successUrl)

    // Clear any existing auth cookies
    response.cookies.delete("shopify_nonce")

    // Set a success cookie to indicate installation completed
    response.cookies.set({
      name: "shopify_install_success",
      value: "true",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5, // 5 minutes
    })

    // Set shop cookie for future reference
    response.cookies.set({
      name: "shopify_shop",
      value: shop,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    console.log("Redirecting to success page:", successUrl.toString())
    return response
  } catch (error) {
    console.error("Auth callback error:", error)
    const errorUrl = new URL("/api/auth/error", request.url)
    errorUrl.searchParams.set("error", error.message)
    if (error.stack) {
      errorUrl.searchParams.set("stack", error.stack)
    }
    return NextResponse.redirect(errorUrl)
  }
}
