import { prisma } from "./prisma"

/**
 * Shopify GraphQL Client for making authenticated requests
 */
export class ShopifyGraphQLClient {
  private shop: string
  private accessToken: string

  constructor(shop: string, accessToken: string) {
    this.shop = shop
    this.accessToken = accessToken
  }

  async query(query: string, variables: any = {}): Promise<any> {
    const endpoint = `https://${this.shop}/admin/api/2023-10/graphql.json`

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
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

/**
 * Activates a Web Pixel in Shopify
 */
export async function activateWebPixel(
  shop: string,
  accessToken: string,
  detectedPixelId?: string | null,
): Promise<{
  success: boolean
  webPixel?: { id: string; settings: string }
  error?: string
}> {
  try {
    console.log(`🎯 [activateWebPixel] Starting for shop: ${shop}`)

    // Get the pixel ID from detected pixel, environment variable, or use a default
    const pixelId = detectedPixelId || process.env.FACEBOOK_PIXEL_ID || "584928510540140" // Default test pixel ID

    console.log(`🔧 [activateWebPixel] Using pixel ID: ${pixelId}`)

    // Prepare Web Pixel settings
    const settings = {
      accountID: pixelId,
      pixelId: pixelId,
      gatewayUrl: `${process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"}/api/track`,
      debug: true,
      timestamp: new Date().toISOString(),
    }

    console.log(`🔧 [activateWebPixel] Web Pixel settings:`, settings)

    // Create Shopify GraphQL client
    const client = new ShopifyGraphQLClient(shop, accessToken)

    // Create Web Pixel
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

    const result = await client.query(WEB_PIXEL_CREATE_MUTATION, {
      webPixel: {
        settings: JSON.stringify(settings),
      },
    })

    console.log(`📨 [activateWebPixel] Web Pixel creation result:`, JSON.stringify(result, null, 2))

    if (result.webPixelCreate?.userErrors && result.webPixelCreate.userErrors.length > 0) {
      console.error(`⚠️ [activateWebPixel] Web Pixel creation errors:`, result.webPixelCreate.userErrors)
      return {
        success: false,
        error: result.webPixelCreate.userErrors.map((err: any) => `${err.message} (${err.code})`).join(", "),
      }
    }

    if (!result.webPixelCreate?.webPixel) {
      console.error(`❌ [activateWebPixel] No Web Pixel created in response`)
      return {
        success: false,
        error: "No Web Pixel created in response",
      }
    }

    const webPixel = result.webPixelCreate.webPixel
    console.log(`✅ [activateWebPixel] Web Pixel created successfully:`, webPixel)

    // Store the Web Pixel ID in the database
    try {
      const cleanShop = shop
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "")
        .toLowerCase()

      await prisma.shopConfig.update({
        where: { shopDomain: cleanShop },
        data: {
          webPixelId: webPixel.id,
          updatedAt: new Date(),
        },
      })
      console.log(`✅ [activateWebPixel] Web Pixel ID stored in database for shop: ${cleanShop}`)
    } catch (dbError) {
      console.error(`⚠️ [activateWebPixel] Failed to store Web Pixel ID in database:`, dbError)
      // Don't fail the activation for this
    }

    return {
      success: true,
      webPixel: {
        id: webPixel.id,
        settings: webPixel.settings,
      },
    }
  } catch (error) {
    console.error(`💥 [activateWebPixel] Error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
