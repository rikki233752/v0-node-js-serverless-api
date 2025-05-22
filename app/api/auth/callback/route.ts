import { type NextRequest, NextResponse } from "next/server"
import { validateHmac, getAccessToken } from "@/lib/shopify"
import { storeShopData } from "@/lib/db-auth"

// OAuth callback endpoint
export async function GET(request: NextRequest) {
  try {
    // Verify HMAC signature from Shopify
    if (!validateHmac(request)) {
      return NextResponse.redirect(new URL("/api/auth/error?error=Invalid HMAC signature", request.url))
    }

    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")

    // Get nonce from cookie
    const nonce = request.cookies.get("shopify_nonce")?.value

    // Validate parameters
    if (!shop || !code || !state || !nonce) {
      return NextResponse.redirect(new URL("/api/auth/error?error=Missing required parameters", request.url))
    }

    // Verify state matches nonce for CSRF protection
    if (state !== nonce) {
      return NextResponse.redirect(new URL("/api/auth/error?error=State does not match nonce", request.url))
    }

    // Exchange authorization code for access token
    const accessToken = await getAccessToken(shop, code)

    // Store shop data in database
    await storeShopData({
      shop,
      accessToken,
      installed: true,
    })

    // Clear auth cookies
    const response = NextResponse.redirect(new URL(`/?shop=${shop}`, request.url))

    response.cookies.delete("shopify_nonce")
    // Keep the shop cookie for session management

    return response
  } catch (error) {
    console.error("Auth callback error:", error)
    return NextResponse.redirect(new URL(`/api/auth/error?error=${encodeURIComponent(error.message)}`, request.url))
  }
}
