import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Get the host from the request
  const host = request.headers.get("host") || "unknown"

  // Get all environment variables related to Shopify
  const shopifyApiKey = process.env.SHOPIFY_API_KEY || "Not set"
  const shopifyApiSecret = process.env.SHOPIFY_API_SECRET ? "Set (masked)" : "Not set"
  const shopifyScopes = process.env.SHOPIFY_SCOPES || "Not set"
  const hostEnvVar = process.env.HOST || "Not set"

  // Calculate the expected redirect URI based on HOST env var
  const expectedRedirectUri = hostEnvVar ? `${hostEnvVar}/api/auth/callback` : "Cannot calculate - HOST not set"

  // The whitelisted redirect URI from the Shopify Partner Dashboard
  const whitelistedRedirectUri = "https://v0-node-js-serverless-api-lake.vercel.app/api/auth/callback"

  // Check if there's a match
  const isMatch = expectedRedirectUri === whitelistedRedirectUri

  // Return all the debug information
  return NextResponse.json({
    request_info: {
      host: host,
      url: request.url,
    },
    environment_variables: {
      SHOPIFY_API_KEY:
        shopifyApiKey.substring(0, 6) +
        "..." +
        (shopifyApiKey.length > 10 ? shopifyApiKey.substring(shopifyApiKey.length - 4) : ""),
      SHOPIFY_API_SECRET: shopifyApiSecret,
      SHOPIFY_SCOPES: shopifyScopes,
      HOST: hostEnvVar,
    },
    redirect_uris: {
      expected_redirect_uri: expectedRedirectUri,
      whitelisted_redirect_uri: whitelistedRedirectUri,
      match: isMatch,
    },
    troubleshooting: {
      has_trailing_slash: hostEnvVar.endsWith("/"),
      suggestion: hostEnvVar.endsWith("/")
        ? "Remove the trailing slash from your HOST environment variable"
        : isMatch
          ? "Your redirect URIs match correctly"
          : "Update your HOST environment variable to match the whitelisted redirect URI",
    },
  })
}
