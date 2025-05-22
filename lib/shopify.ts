import axios from "axios"
import { prisma } from "./db"

// Verify if a request is from Shopify
export async function verifyShopifyRequest(request: Request): Promise<boolean> {
  try {
    const shop = request.headers.get("x-shopify-shop-domain")
    if (!shop) return false

    // Get the HMAC header
    const hmac = request.headers.get("x-shopify-hmac-sha256")
    if (!hmac) return false

    // Get the request body as text
    const body = await request.text()

    // Calculate the HMAC
    const crypto = require("crypto")
    const calculatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
      .update(body)
      .digest("base64")

    // Compare the calculated HMAC with the one from the header
    return hmac === calculatedHmac
  } catch (error) {
    console.error("Error verifying Shopify request:", error)
    return false
  }
}

// Get a store's access token
export async function getShopifyAccessToken(shop: string): Promise<string | null> {
  try {
    const store = await prisma.shopifyStore.findUnique({
      where: { domain: shop },
    })

    return store?.accessToken || null
  } catch (error) {
    console.error("Error getting access token:", error)
    return null
  }
}

// Make an authenticated API call to Shopify
export async function shopifyApiRequest(shop: string, endpoint: string, method = "GET", data = null) {
  try {
    const accessToken = await getShopifyAccessToken(shop)
    if (!accessToken) {
      throw new Error(`No access token found for shop: ${shop}`)
    }

    const url = `https://${shop}/admin/api/2023-10/${endpoint}`

    const response = await axios({
      method,
      url,
      data,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    })

    return response.data
  } catch (error) {
    console.error(`Shopify API request failed for ${shop}:`, error)
    throw error
  }
}
