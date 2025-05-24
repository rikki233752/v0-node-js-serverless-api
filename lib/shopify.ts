import type { NextRequest } from "next/server"
import crypto from "crypto"

/**
 * Validates the HMAC signature from Shopify
 */
export function validateHmac(req: NextRequest): boolean {
  // Get the query params from the request URL
  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams.entries())

  const hmac = params.hmac
  delete params.hmac

  // Create the message to sign
  const message = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("&")

  // Generate the HMAC signature
  const generatedHash = crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET).update(message).digest("hex")

  // Compare the generated hash with the provided HMAC
  return generatedHash === hmac
}

/**
 * Generates a random nonce for OAuth
 */
export function generateNonce(length = 32): string {
  return crypto.randomBytes(length).toString("hex")
}

/**
 * Builds the OAuth authorization URL
 */
export function getAuthUrl(shop: string, nonce: string): string {
  const scopes = process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events"

  // Get the HOST environment variable
  const host = process.env.HOST || ""

  // Remove trailing slash if present
  const cleanHost = host.endsWith("/") ? host.slice(0, -1) : host

  // Build the redirect URI
  const redirectUri = `${cleanHost}/api/auth/callback`

  // Log the redirect URI for debugging
  console.log({
    message: "Building auth URL",
    shop,
    host: cleanHost,
    redirectUri,
    apiKey: process.env.SHOPIFY_API_KEY,
    nonce,
  })

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  authUrl.searchParams.append("client_id", process.env.SHOPIFY_API_KEY)
  authUrl.searchParams.append("scope", scopes)
  authUrl.searchParams.append("redirect_uri", redirectUri)
  authUrl.searchParams.append("state", nonce) // This is crucial!

  return authUrl.toString()
}

/**
 * Exchanges the authorization code for an access token
 */
export async function getAccessToken(shop: string, code: string): Promise<string> {
  const url = `https://${shop}/admin/oauth/access_token`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`)
  }

  return data.access_token
}

/**
 * Verifies that the shop parameter is a valid Shopify shop
 */
export function isValidShop(shop: string): boolean {
  // Clean the shop domain first
  let cleanShop = shop.trim().toLowerCase()

  // Remove protocol (http:// or https://)
  cleanShop = cleanShop.replace(/^https?:\/\//, "")

  // Remove trailing slash
  cleanShop = cleanShop.replace(/\/$/, "")

  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
  return shopRegex.test(cleanShop)
}
