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
    requestUrl: request.url,
    headers: {
      host: request.headers.get("host"),
      userAgent: request.headers.get("user-agent"),
    },
  })

  // If no shop parameter is provided, redirect to the home page
  if (!shop) {
    console.log("No shop parameter provided, redirecting to home")
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Validate shop parameter
  if (!isValidShop(shop)) {
    console.error("Invalid shop parameter:", shop)
    const errorUrl = new URL("/api/auth/error", request.url)
    errorUrl.searchParams.set("error", `Invalid shop parameter: ${shop}`)
    return NextResponse.redirect(errorUrl)
  }

  // Generate nonce for security
  const nonce = generateNonce()

  // Get the authorization URL
  const authUrl = getAuthUrl(shop, nonce)

  // Log the auth URL for debugging
  console.log({
    message: "Generated auth URL",
    authUrl,
    nonce,
    shop,
  })

  // Store nonce in cookie for verification during callback
  const response = NextResponse.redirect(authUrl)

  // Set cookies with more permissive settings to ensure they work
  response.cookies.set({
    name: "shopify_nonce",
    value: nonce,
    httpOnly: false, // Allow JavaScript access for debugging
    secure: process.env.NODE_ENV === "production",
    sameSite: "none", // More permissive for cross-site requests
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })

  // Add shop to cookie for convenience
  response.cookies.set({
    name: "shopify_shop",
    value: shop,
    httpOnly: false, // Allow JavaScript access for debugging
    secure: process.env.NODE_ENV === "production",
    sameSite: "none", // More permissive for cross-site requests
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })

  console.log("Redirecting to Shopify OAuth:", authUrl)
  console.log("Set cookies:", { nonce, shop })
  return response
}
