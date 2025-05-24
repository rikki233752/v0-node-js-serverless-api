import { type NextRequest, NextResponse } from "next/server"
import { isValidShop, generateNonce } from "@/lib/shopify"

// Direct installation endpoint that creates the OAuth URL
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const shop = url.searchParams.get("shop")

  console.log("Direct install request:", { shop, url: request.url })

  if (!shop) {
    return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
  }

  if (!isValidShop(shop)) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 })
  }

  // Generate the OAuth URL directly
  const scopes = process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events"
  const host = process.env.HOST || ""
  const cleanHost = host.endsWith("/") ? host.slice(0, -1) : host
  const redirectUri = `${cleanHost}/api/auth/callback`
  const nonce = generateNonce()

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  authUrl.searchParams.append("client_id", process.env.SHOPIFY_API_KEY)
  authUrl.searchParams.append("scope", scopes)
  authUrl.searchParams.append("redirect_uri", redirectUri)
  authUrl.searchParams.append("state", nonce)

  console.log("Generated direct install URL:", {
    authUrl: authUrl.toString(),
    redirectUri,
    nonce,
  })

  // Return the OAuth URL for the user to visit
  return NextResponse.json({
    success: true,
    installUrl: authUrl.toString(),
    redirectUri,
    shop,
    nonce,
    message: "Visit the installUrl to complete the installation",
  })
}
