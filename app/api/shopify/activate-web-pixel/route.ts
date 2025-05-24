import { NextResponse } from "next/server"
import { ShopifyGraphQLClient } from "@/lib/shopify-graphql"

const WEB_PIXEL_CREATE_MUTATION = `
  mutation webPixelCreate($webPixel: WebPixelInput!) {
    webPixelCreate(webPixel: $webPixel) {
      webPixel {
        id
        settings
      }
      userErrors {
        field
        message
      }
    }
  }
`

export async function POST(request: Request) {
  try {
    const { shop } = await request.json()

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Activating Web Pixel for shop:", shop)

    // Create GraphQL client
    const client = await ShopifyGraphQLClient.fromShop(shop)

    // Prepare the Web Pixel configuration
    const webPixelInput = {
      settings: {
        accountID: "facebook-pixel-gateway",
        // Add any other settings your Web Pixel extension expects
      },
    }

    console.log("Creating Web Pixel with input:", webPixelInput)

    // Execute the mutation
    const result = await client.query(WEB_PIXEL_CREATE_MUTATION, {
      webPixel: webPixelInput,
    })

    console.log("Web Pixel creation result:", result)

    if (result.webPixelCreate.userErrors && result.webPixelCreate.userErrors.length > 0) {
      const errors = result.webPixelCreate.userErrors.map((error: any) => error.message).join(", ")
      return NextResponse.json(
        {
          success: false,
          error: `Web Pixel creation failed: ${errors}`,
          userErrors: result.webPixelCreate.userErrors,
        },
        { status: 400 },
      )
    }

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

    return NextResponse.json({
      success: true,
      webPixel: result.webPixelCreate.webPixel,
      message: "Web Pixel activated successfully",
    })
  } catch (error) {
    console.error("Error activating Web Pixel:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
