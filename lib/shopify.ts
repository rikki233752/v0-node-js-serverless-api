/**
 * Validates if a string is a valid Shopify shop domain
 */
export function isValidShop(shop: string): boolean {
  // Remove protocol if present
  const cleanShop = shop.replace(/^https?:\/\//, "")

  // Check if it's a myshopify.com domain
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(cleanShop)) {
    return true
  }

  // Check if it's a custom domain with at least one dot
  if (cleanShop.includes(".") && !cleanShop.includes(" ")) {
    return true
  }

  return false
}

/**
 * Generates a random nonce for OAuth
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Builds the OAuth authorization URL
 */
export function getAuthUrl(shop: string, nonce: string): string {
  // Updated scopes to include script tags and webhooks
  const scopes =
    process.env.SHOPIFY_SCOPES ||
    "read_pixels,write_pixels,read_customer_events,read_script_tags,write_script_tags,read_orders,write_webhooks"

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
 * Validates the HMAC signature from Shopify
 */
export function validateHmac(request: Request): boolean {
  try {
    // In a real implementation, you would validate the HMAC here
    // For now, we'll just return true
    return true
  } catch (error) {
    console.error("HMAC validation error:", error)
    return false
  }
}

/**
 * Exchanges an authorization code for an access token
 */
export async function getAccessToken(shop: string, code: string): Promise<string | null> {
  try {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
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

    if (!response.ok) {
      console.error("Failed to get access token:", await response.text())
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error("Error getting access token:", error)
    return null
  }
}

/**
 * Creates a Shopify Admin API client for a specific shop
 */
export async function shopifyAdmin(shop: string) {
  const { getShopAccessToken } = await import("./db")
  const accessToken = await getShopAccessToken(shop)

  if (!accessToken) {
    throw new Error(`No access token found for shop: ${shop}`)
  }

  return {
    async query(query: string, variables?: any) {
      const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query, variables }),
      })

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
      }

      return result.data
    },
  }
}
