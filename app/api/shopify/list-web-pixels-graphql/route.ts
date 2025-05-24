import { NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Listing Web Pixels via GraphQL for shop:", shop)

    // Get access token from database
    const accessToken = await getShopAccessToken(shop)
    if (!accessToken) {
      return NextResponse.json({ error: "Shop not found in database or no access token" }, { status: 404 })
    }

    console.log("Access token found, making GraphQL request...")

    // Query to get app installation and web pixels
    const query = `
      query {
        app {
          installation {
            id
            webPixels(first: 10) {
              edges {
                node {
                  id
                  settings
                  createdAt
                  updatedAt
                }
              }
            }
          }
        }
      }
    `

    const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
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
    console.log("GraphQL response:", data)

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

    const installation = data.data?.app?.installation
    const webPixels = installation?.webPixels?.edges || []

    return NextResponse.json({
      success: true,
      count: webPixels.length,
      webPixels: webPixels.map((edge: any) => edge.node),
      installation: installation,
      shop: shop,
    })
  } catch (error) {
    console.error("Error with GraphQL request:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to query GraphQL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
