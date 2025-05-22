import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Only enable in development mode or with a special debug parameter
  const url = new URL(request.url)
  const debugParam = url.searchParams.get("debug")

  if (process.env.NODE_ENV !== "development" && debugParam !== "true") {
    return NextResponse.json(
      { error: "Debug endpoint only available in development mode or with debug parameter" },
      { status: 403 },
    )
  }

  // Get the host from the request
  const host = request.headers.get("host") || "unknown"

  // Calculate the expected redirect URI based on HOST env var
  const hostEnvVar = process.env.HOST || ""
  const expectedRedirectUri = `${hostEnvVar}/api/auth/callback`

  // Return masked environment variables for debugging
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    host_from_request: host,
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? `${process.env.SHOPIFY_API_KEY.substring(0, 6)}...` : "Not set",
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "Set (masked)" : "Not set",
    SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES || "Not set",
    HOST: process.env.HOST || "Not set",
    expected_redirect_uri: expectedRedirectUri,
    whitelisted_redirect_uri: "https://v0-node-js-serverless-api-lake.vercel.app/api/auth/callback",
  })
}
