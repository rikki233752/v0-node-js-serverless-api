import { NextResponse } from "next/server"
import crypto from "crypto"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const shop = url.searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter is required" }, { status: 400 })
    }

    // Validate the shop domain
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 })
    }

    // Generate a random nonce for security
    const nonce = crypto.randomBytes(16).toString("hex")

    // Construct the authorization URL
    const redirectUri = `${process.env.APP_URL}/api/auth/callback`
    const scopes = "write_pixels,read_customer_events" // Add any other scopes your app needs

    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${
      process.env.SHOPIFY_API_KEY
    }&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`

    // Redirect to Shopify's OAuth page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ error: "Failed to initiate OAuth" }, { status: 500 })
  }
}
