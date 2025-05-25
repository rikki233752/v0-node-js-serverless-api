import { type NextRequest, NextResponse } from "next/server"
import { isValidShop, generateNonce } from "@/lib/shopify"

// Enhanced installation endpoint that accepts pixel ID
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const shop = url.searchParams.get("shop")
  const pixelId = url.searchParams.get("pixelId") || url.searchParams.get("pixel_id")

  console.log("Direct install request:", { shop, pixelId, url: request.url })

  if (!shop) {
    return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
  }

  if (!isValidShop(shop)) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 })
  }

  // Generate the OAuth URL with pixel ID in state
  const scopes = process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events"
  const host = process.env.HOST || ""
  const cleanHost = host.endsWith("/") ? host.slice(0, -1) : host
  const redirectUri = `${cleanHost}/api/auth/callback`

  // Create state with nonce and pixel ID
  const nonce = generateNonce()
  const state = JSON.stringify({
    nonce,
    pixelId: pixelId || null,
  })

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  authUrl.searchParams.append("client_id", process.env.SHOPIFY_API_KEY)
  authUrl.searchParams.append("scope", scopes)
  authUrl.searchParams.append("redirect_uri", redirectUri)
  authUrl.searchParams.append("state", Buffer.from(state).toString("base64"))

  console.log("Generated direct install URL with pixel ID:", {
    authUrl: authUrl.toString(),
    redirectUri,
    pixelId,
  })

  // Redirect directly to Shopify OAuth
  return NextResponse.redirect(authUrl.toString())
}
