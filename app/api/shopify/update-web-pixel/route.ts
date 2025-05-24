import { NextResponse } from "next/server"
import { ShopifyGraphQLClient } from "@/lib/shopify-graphql"

const WEB_PIXEL_UPDATE_MUTATION = `
  mutation webPixelUpdate($id: ID!, $webPixel: WebPixelInput!) {
    webPixelUpdate(id: $id, webPixel: $webPixel) {
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

const WEB_PIXELS_QUERY = `
  query {
    currentAppInstallation {
      id
    }
  }
`

export async function POST(request: Request) {
  try {
    const { shop, accountID, pixelId, gatewayUrl, debug, webPixelId } = await request.json()

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Updating Web Pixel for shop:", shop)

    // Create GraphQL client
    const client = await ShopifyGraphQLClient.fromShop(shop)

    // If webPixelId is provided, use it. Otherwise, we'll need to find it
    const targetWebPixelId = webPixelId

    if (!targetWebPixelId) {
      // For now, we'll assume there's an existing Web Pixel
      // In a real implementation, you'd query for existing Web Pixels
      return NextResponse.json(
        {
          success: false,
          error: "Web Pixel ID required for update",
          message: "Please provide the ID of the Web Pixel to update",
        },
        { status: 400 },
      )
    }

    // Prepare the updated settings
    const settings = {
      accountID: accountID || pixelId || process.env.FACEBOOK_PIXEL_ID || "",
      pixelId: pixelId || accountID || process.env.FACEBOOK_PIXEL_ID || "",
      gatewayUrl:
        gatewayUrl || process.env.HOST + "/api/track" || "https://v0-node-js-serverless-api-lake.vercel.app/api/track",
      debug: debug !== undefined ? debug : true,
    }

    const settingsJson = JSON.stringify(settings)

    console.log("Updating Web Pixel with settings:", settingsJson)

    // Execute the update mutation
    const result = await client.query(WEB_PIXEL_UPDATE_MUTATION, {
      id: targetWebPixelId,
      webPixel: {
        settings: settingsJson,
      },
    })

    console.log("Web Pixel update result:", result)

    // Check for user errors
    if (result.webPixelUpdate.userErrors && result.webPixelUpdate.userErrors.length > 0) {
      const errors = result.webPixelUpdate.userErrors
      console.error("Web Pixel update errors:", errors)

      return NextResponse.json(
        {
          success: false,
          error: "Web Pixel update failed",
          userErrors: errors,
          details: errors.map((err: any) => `${err.field}: ${err.message} (${err.code})`).join(", "),
        },
        { status: 400 },
      )
    }

    // Check if web pixel was updated
    if (!result.webPixelUpdate.webPixel) {
      return NextResponse.json(
        {
          success: false,
          error: "Web Pixel update failed - no pixel returned",
          result,
        },
        { status: 500 },
      )
    }

    const webPixel = result.webPixelUpdate.webPixel

    return NextResponse.json({
      success: true,
      webPixel: {
        id: webPixel.id,
        settings: JSON.parse(webPixel.settings),
      },
      message: "Web Pixel updated successfully! Check Settings > Customer events in your Shopify admin.",
      instructions: "The existing Web Pixel has been updated with your new Facebook Pixel ID.",
    })
  } catch (error) {
    console.error("Error updating Web Pixel:", error)

    let errorMessage = "Internal server error"
    let errorDetails = "Unknown error"

    if (error instanceof Error) {
      errorDetails = error.message

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
      },
      { status: 500 },
    )
  }
}
