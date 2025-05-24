import { type NextRequest, NextResponse } from "next/server"
import { validateHmac, getAccessToken } from "@/lib/shopify"
import { storeShopData } from "@/lib/db-auth"

// OAuth callback endpoint
export async function GET(request: NextRequest) {
  try {
    console.log("OAuth callback received:", request.url)

    // Verify HMAC signature from Shopify
    if (!validateHmac(request)) {
      console.error("HMAC validation failed")
      return NextResponse.redirect(new URL("/api/auth/error?error=Invalid HMAC signature", request.url))
    }

    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")

    console.log("OAuth params:", { shop, code: code ? "present" : "missing", state })

    // Get nonce from cookie
    const nonce = request.cookies.get("shopify_nonce")?.value

    // Validate parameters
    if (!shop || !code || !state || !nonce) {
      console.error("Missing required parameters:", { shop, code: !!code, state, nonce: !!nonce })
      return NextResponse.redirect(new URL("/api/auth/error?error=Missing required parameters", request.url))
    }

    // Verify state matches nonce for CSRF protection
    if (state !== nonce) {
      console.error("State mismatch:", { state, nonce })
      return NextResponse.redirect(new URL("/api/auth/error?error=State does not match nonce", request.url))
    }

    // Exchange authorization code for access token
    console.log("Exchanging code for access token...")
    const accessToken = await getAccessToken(shop, code)
    console.log("Access token received:", accessToken ? "success" : "failed")

    // Store shop data in database with installed=true
    await storeShopData({
      shop,
      accessToken,
      scopes: process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events",
      installed: true,
    })

    console.log("Shop data stored successfully")

    // Create response with success redirect
    const successUrl = new URL("/auth/success", request.url)
    successUrl.searchParams.set("shop", shop)

    const response = NextResponse.redirect(successUrl)

    // Clear auth cookies
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

    console.log("Redirecting to success page")
    return response
  } catch (error) {
    console.error("Auth callback error:", error)
    return NextResponse.redirect(new URL(`/api/auth/error?error=${encodeURIComponent(error.message)}`, request.url))
  }
}
