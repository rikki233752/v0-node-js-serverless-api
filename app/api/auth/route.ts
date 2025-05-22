import { type NextRequest, NextResponse } from "next/server"
import { isValidShop, getAuthUrl, generateNonce } from "@/lib/shopify"

// Initial auth endpoint that starts the OAuth flow
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const shop = url.searchParams.get("shop")

  // Get the HOST environment variable
  const host = process.env.HOST || ""

  // Calculate the redirect URI that will be used
  const redirectUri = `${host}/api/auth/callback`

  // Log information for debugging
  console.log({
    message: "Starting OAuth flow",
    shop,
    host,
    redirectUri,
    apiKey: process.env.SHOPIFY_API_KEY ? "Set" : "Not set",
    apiSecret: process.env.SHOPIFY_API_SECRET ? "Set" : "Not set",
  })

  // If no shop parameter is provided, redirect to the home page
  if (!shop) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Validate shop parameter
  if (!isValidShop(shop)) {
    return NextResponse.redirect(new URL(`/api/auth/error?error=Invalid shop parameter: ${shop}`, request.url))
  }

  // Generate nonce for security
  const nonce = generateNonce()

  // Get the authorization URL
  const authUrl = getAuthUrl(shop, nonce)

  // Log the auth URL for debugging
  console.log({
    message: "Generated auth URL",
    authUrl,
  })

  // Store nonce in cookie for verification during callback
  const response = NextResponse.redirect(authUrl)

  // Set a secure cookie with the nonce
  response.cookies.set({
    name: "shopify_nonce",
    value: nonce,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })

  // Add shop to cookie for convenience
  response.cookies.set({
    name: "shopify_shop",
    value: shop,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })

  return response
}
