import { type NextRequest, NextResponse } from "next/server"
import { isValidShop, getAuthUrl, generateNonce } from "@/lib/shopify"

// Initial auth endpoint that starts the OAuth flow
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const shop = url.searchParams.get("shop")

  // Log the HOST environment variable
  console.log("HOST environment variable:", process.env.HOST)

  // Calculate the redirect URI that will be used
  const redirectUri = `${process.env.HOST}/api/auth/callback`
  console.log("Calculated redirect URI:", redirectUri)

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

  // Store nonce in cookie for verification during callback
  const response = NextResponse.redirect(getAuthUrl(shop, nonce))

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
