import { NextResponse } from "next/server"
import { ShopifyGraphQLClient } from "@/lib/shopify-graphql"

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

export async function POST(request: Request) {
  try {
    const { shop, accountID, pixelId, gatewayUrl, debug } = await request.json()

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Activating Web Pixel for shop:", shop)

    // Create GraphQL client
    const client = await ShopifyGraphQLClient.fromShop(shop)

    // Prepare the settings according to your shopify.extension.toml
    const settings = {
      accountID: accountID || "facebook-pixel-gateway",
      pixelId: pixelId || process.env.FACEBOOK_PIXEL_ID || "",
      gatewayUrl:
        gatewayUrl || process.env.HOST + "/api/track" || "https://v0-node-js-serverless-api-lake.vercel.app/api/track",
      debug: debug || false,
    }

    // Convert settings to JSON string as required by Shopify
    const settingsJson = JSON.stringify(settings)

    console.log("Creating Web Pixel with settings:", settingsJson)

    // Execute the mutation exactly as shown in Shopify docs
    const result = await client.query(WEB_PIXEL_CREATE_MUTATION, {
      webPixel: {
        settings: settingsJson,
      },
    })

    console.log("Web Pixel creation result:", result)

    // Check for user errors
    if (result.webPixelCreate.userErrors && result.webPixelCreate.userErrors.length > 0) {
      const errors = result.webPixelCreate.userErrors
      console.error("Web Pixel creation errors:", errors)

      return NextResponse.json(
        {
          success: false,
          error: "Web Pixel creation failed",
          userErrors: errors,
          details: errors.map((err: any) => `${err.field}: ${err.message} (${err.code})`).join(", "),
        },
        { status: 400 },
      )
    }

    // Check if web pixel was created
    if (!result.webPixelCreate.webPixel) {
      return NextResponse.json(
        {
          success: false,
          error: "Web Pixel creation failed - no pixel returned",
          result,
        },
        { status: 500 },
      )
    }

    const webPixel = result.webPixelCreate.webPixel

    return NextResponse.json({
      success: true,
      webPixel: {
        id: webPixel.id,
        settings: JSON.parse(webPixel.settings),
      },
      message: "Web Pixel activated successfully! Check Settings > Customer events in your Shopify admin.",
      instructions:
        "Go to your Shopify admin → Settings → Customer events to see your app listed with 'Connected' status.",
    })
  } catch (error) {
    console.error("Error activating Web Pixel:", error)

    // More detailed error handling
    let errorMessage = "Internal server error"
    let errorDetails = "Unknown error"

    if (error instanceof Error) {
      errorDetails = error.message

      // Check for specific GraphQL errors
      if (error.message.includes("GraphQL errors")) {
        errorMessage = "GraphQL API error"
      } else if (error.message.includes("Shop not found")) {
        errorMessage = "Shop not registered in database"
      } else if (error.message.includes("access_token")) {
        errorMessage = "Invalid or expired access token"
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        suggestion:
          errorMessage === "Shop not registered in database"
            ? "Please register your shop first using the manual registration option"
            : "Check your app permissions and access token",
      },
      { status: 500 },
    )
  }
}
