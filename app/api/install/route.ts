import { type NextRequest, NextResponse } from "next/server"
import { isValidShop } from "@/lib/shopify"

// Enhanced installation endpoint that accepts pixel ID
export async function GET(request: NextRequest) {
  try {
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
    const host = process.env.NEXT_PUBLIC_HOST || ""
    const redirectUri = `${host}/api/auth/callback`

    // Create state with pixel ID
    const state = Buffer.from(
      JSON.stringify({
        pixelId: pixelId || null,
      }),
    ).toString("base64")

    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.append("client_id", process.env.SHOPIFY_API_KEY || "")
    authUrl.searchParams.append("scope", scopes)
    authUrl.searchParams.append("redirect_uri", redirectUri)
    authUrl.searchParams.append("state", state)

    console.log("Generated direct install URL with pixel ID:", {
      authUrl: authUrl.toString(),
      redirectUri,
      pixelId,
    })

    // Redirect directly to Shopify OAuth
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error("Error in install route:", error)
    return NextResponse.json({ error: "Installation failed" }, { status: 500 })
  }
}
