import { NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Exploring GraphQL schema for shop:", shop)

    // Get access token from database
    const accessToken = await getShopAccessToken(shop)
    if (!accessToken) {
      return NextResponse.json({ error: "Shop not found in database or no access token" }, { status: 404 })
    }

    // Try different queries to find web pixels
    const queries = [
      {
        name: "App Installation Info",
        query: `
          query {
            app {
              installation {
                id
                __typename
              }
            }
          }
        `,
      },
      {
        name: "Current App Info",
        query: `
          query {
            currentAppInstallation {
              id
              __typename
            }
          }
        `,
      },
      {
        name: "Shop Info",
        query: `
          query {
            shop {
              id
              name
              __typename
            }
          }
        `,
      },
    ]

    const results = []

    for (const { name, query } of queries) {
      try {
        const response = await fetch(`https://${shop}/admin/api/2023-10/graphql.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        })

        const data = await response.json()
        results.push({
          name,
          success: !data.errors,
          data: data.data,
          errors: data.errors,
        })
      } catch (error) {
        results.push({
          name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      shop,
      results,
      message: "GraphQL exploration complete",
    })
  } catch (error) {
    console.error("Error exploring GraphQL:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to explore GraphQL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
