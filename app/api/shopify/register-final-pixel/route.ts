import { NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"
import axios from "axios"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop") || "test-rikki-new.myshopify.com"

    const accessToken = await getShopAccessToken(shop)
    if (!accessToken) {
      return NextResponse.json({ error: "No access token found" }, { status: 404 })
    }

    // First, check if there are any existing web pixels
    const queryExisting = `
      query {
        webPixels(first: 10) {
          edges {
            node {
              id
              settings
            }
          }
        }
      }
    `

    const existingResponse = await axios.post(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      { query: queryExisting },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      },
    )

    const existingPixels = existingResponse.data?.data?.webPixels?.edges || []

    // Delete existing web pixels
    for (const pixel of existingPixels) {
      const pixelId = pixel.node.id.split("/").pop()

      const deleteMutation = `
        mutation {
          webPixelDelete(id: "gid://shopify/WebPixel/${pixelId}") {
            userErrors {
              field
              message
            }
            deletedWebPixelId
          }
        }
      `

      await axios.post(
        `https://${shop}/admin/api/2024-01/graphql.json`,
        { query: deleteMutation },
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Create a new web pixel
    const mutation = `
      mutation {
        webPixelCreate(webPixel: {
          settings: "{\\"pixelId\\":\\"584928510540140\\",\\"debug\\":true}"
        }) {
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

    const response = await axios.post(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      { query: mutation },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      },
    )

    return NextResponse.json({
      success: true,
      message: "Web Pixel registered successfully",
      existingPixels: existingPixels.length,
      deletedPixels: existingPixels.length,
      newPixel: response.data?.data?.webPixelCreate?.webPixel,
      errors: response.data?.data?.webPixelCreate?.userErrors,
    })
  } catch (error) {
    console.error("Error registering Web Pixel:", error)
    return NextResponse.json({ error: "Failed to register Web Pixel" }, { status: 500 })
  }
}
