import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get("shop")

  // Get environment variables
  const envVars = {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "Set" : "Not set",
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "Set" : "Not set",
    SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES || "Not set",
    HOST: process.env.HOST || "Not set",
    NODE_ENV: process.env.NODE_ENV || "Not set",
  }

  // Calculate URLs
  const host = process.env.HOST || ""
  const redirectUri = `${host}/api/auth/callback`
  const installUrl = shop ? `${host}/api/auth?shop=${shop}` : "Need shop parameter"

  return NextResponse.json({
    environment: envVars,
    urls: {
      host,
      redirectUri,
      installUrl,
      currentUrl: request.url,
    },
    shop: shop || "Not provided",
    timestamp: new Date().toISOString(),
  })
}
