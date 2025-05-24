import { NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { shop, accountID } = await request.json()

    if (!shop || !accountID) {
      return NextResponse.json({ error: "Shop and accountID required" }, { status: 400 })
    }

    console.log("Testing Web Pixel creation for shop:", shop, "with accountID:", accountID)

    // Get access token from database
    const accessToken = await getShopAccessToken(shop)
    if (!accessToken) {
      return NextResponse.json({ error: "Shop not found in database or no access token" }, { status: 404 })
    }

    console.log("Access token found, creating Web Pixel...")

    // Create Web Pixel settings
    const settings = {
      accountID: accountID,
      pixelId: accountID,
      gatewayUrl: `${process.env.HOST}/api/track`,
      debug: true,
      configurationReceived: true,
      settingsReceived: true,
      timestamp: new Date().toISOString(),
    }

    const settingsJson = JSON.stringify(settings)
    console.log("Web Pixel settings:", settingsJson)

    // GraphQL mutation to create Web Pixel
    const mutation = `
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

    const variables = {
      webPixel: {
        settings: settingsJson,
      },
    }

    const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation, variables }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Shopify GraphQL error:", response.status, errorText)

      return NextResponse.json(
        {
          success: false,
          error: `Shopify GraphQL error: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("Web Pixel creation response:", data)

    if (data.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "GraphQL errors",
          details: JSON.stringify(data.errors),
        },
        { status: 400 },
      )
    }

    const result = data.data?.webPixelCreate

    if (result?.userErrors && result.userErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Web Pixel creation failed",
          userErrors: result.userErrors,
          details: result.userErrors.map((e: any) => `${e.field}: ${e.message} (${e.code})`).join(", "),
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Web Pixel created successfully",
      webPixel: result?.webPixel,
      settings: settings,
    })
  } catch (error) {
    console.error("Error creating Web Pixel:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create Web Pixel",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
