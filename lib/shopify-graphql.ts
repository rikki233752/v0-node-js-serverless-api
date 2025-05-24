import { getShopData } from "./db-auth"

export class ShopifyGraphQLClient {
  private shop: string
  private accessToken: string

  constructor(shop: string, accessToken: string) {
    this.shop = shop
    this.accessToken = accessToken
  }

  static async fromShop(shop: string): Promise<ShopifyGraphQLClient> {
    const shopData = await getShopData(shop)
    if (!shopData) {
      throw new Error("Shop not found in database")
    }
    return new ShopifyGraphQLClient(shop, shopData.accessToken)
  }

  async query(query: string, variables: any = {}): Promise<any> {
    const response = await fetch(`https://${this.shop}/admin/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": this.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} - ${responseText}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    return data.data
  }
}

// Exact mutation from Shopify documentation
const WEB_PIXEL_CREATE_MUTATION = `
  mutation webPixelCreate($webPixel: WebPixelInput!) {
    webPixelCreate(webPixel: $webPixel) {
      userErrors {
        code
        field
        message
      }
      webPixel {
        settings
        id
      }
    }
  }
`

export async function activateWebPixel(shop: string, accessToken: string, pixelId?: string) {
  try {
    console.log("🚀 Starting Web Pixel activation for shop:", shop)

    const client = new ShopifyGraphQLClient(shop, accessToken)

    // Use the exact format from Shopify documentation
    // Start with the simple accountID format, then add other settings
    const settings = {
      accountID: pixelId || process.env.FACEBOOK_PIXEL_ID || "123", // Use 123 as fallback like in docs
    }

    // Add additional settings if they exist
    if (process.env.FACEBOOK_PIXEL_ID || pixelId) {
      settings.pixelId = pixelId || process.env.FACEBOOK_PIXEL_ID
    }

    if (process.env.HOST) {
      settings.gatewayUrl = process.env.HOST + "/api/track"
    }

    settings.debug = process.env.NODE_ENV === "development"

    // Convert settings to JSON string as required by Shopify
    const settingsJson = JSON.stringify(settings)

    console.log("📝 Creating Web Pixel with settings:", settingsJson)
    console.log("🔧 Using access token:", accessToken ? "present" : "missing")

    // Execute the exact mutation from Shopify docs
    const result = await client.query(WEB_PIXEL_CREATE_MUTATION, {
      webPixel: {
        settings: settingsJson,
      },
    })

    console.log("📊 Web Pixel creation result:", JSON.stringify(result, null, 2))

    // Check for user errors
    if (result.webPixelCreate.userErrors && result.webPixelCreate.userErrors.length > 0) {
      const errors = result.webPixelCreate.userErrors
      console.error("❌ Web Pixel creation user errors:", errors)
      return {
        success: false,
        error: "Web Pixel creation failed",
        userErrors: errors,
        details: errors.map((err: any) => `${err.field}: ${err.message} (${err.code})`).join(", "),
      }
    }

    // Check if web pixel was created
    if (!result.webPixelCreate.webPixel) {
      console.error("❌ Web Pixel creation failed - no pixel returned")
      return {
        success: false,
        error: "Web Pixel creation failed - no pixel returned",
        result,
      }
    }

    console.log("✅ Web Pixel created successfully:", result.webPixelCreate.webPixel.id)
    return {
      success: true,
      webPixel: result.webPixelCreate.webPixel,
      message: `Web Pixel created with ID: ${result.webPixelCreate.webPixel.id}`,
    }
  } catch (error) {
    console.error("💥 Error in activateWebPixel:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }
  }
}
