import { type NextRequest, NextResponse } from "next/server"
import { getShopAccessToken } from "@/lib/db"
import axios from "axios"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop") || "test-rikki-new.myshopify.com"

    const accessToken = await getShopAccessToken(shop)
    if (!accessToken) {
      return NextResponse.json({ error: "No access token found" }, { status: 404 })
    }

    // Get all Web Pixels
    const query = `
      query {
        webPixel {
          id
          settings
        }
      }
    `

    const response = await axios.post(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      { query },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      },
    )

    return NextResponse.json({
      shop,
      webPixels: response.data,
      analysis: {
        hasWebPixel: !!response.data?.data?.webPixel,
        settings: response.data?.data?.webPixel?.settings,
      },
    })
  } catch (error) {
    console.error("Error checking Web Pixel code:", error)
    return NextResponse.json({ error: "Failed to check Web Pixel code" }, { status: 500 })
  }
}
