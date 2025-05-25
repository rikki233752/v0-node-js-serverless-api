import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import axios from "axios"

export async function POST(request: Request) {
  try {
    console.log("🔄 [Install Script Tag] Starting process...")

    // Get the shop domain and access token from the request
    const body = await request.json()
    const { shop, accessToken } = body

    if (!shop || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Shop domain and access token are required",
        },
        { status: 400 },
      )
    }

    console.log(`🏪 [Install Script Tag] Processing for shop: ${shop}`)

    // Find the shop configuration
    const shopConfig = await prisma.shopConfig.findFirst({
      where: { shopDomain: shop },
      include: { pixelConfig: true },
    })

    if (!shopConfig) {
      console.log(`❌ [Install Script Tag] No shop configuration found for: ${shop}`)
      return NextResponse.json(
        {
          success: false,
          error: "Shop configuration not found",
        },
        { status: 404 },
      )
    }

    console.log(`✅ [Install Script Tag] Found shop configuration for: ${shop}`)

    // Get the pixel ID
    const pixelId = shopConfig.pixelConfig?.pixelId || process.env.FACEBOOK_PIXEL_ID

    if (!pixelId) {
      console.log(`❌ [Install Script Tag] No pixel ID found for: ${shop}`)
      return NextResponse.json(
        {
          success: false,
          error: "No pixel ID found",
        },
        { status: 404 },
      )
    }

    console.log(`🎯 [Install Script Tag] Using pixel ID: ${pixelId}`)

    // Create the script tag in Shopify
    const scriptUrl = `https://v0-node-js-serverless-api-lake.vercel.app/facebook-pixel.js?pixel=${pixelId}&shop=${encodeURIComponent(shop)}`

    try {
      const response = await axios.post(
        `https://${shop}/admin/api/2023-07/script_tags.json`,
        {
          script_tag: {
            event: "onload",
            src: scriptUrl,
            display_scope: "online_store",
          },
        },
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        },
      )

      console.log(`✅ [Install Script Tag] Script tag created:`, response.data)

      // Return success with the script tag ID
      return NextResponse.json({
        success: true,
        message: "Script tag installed successfully",
        scriptTagId: response.data.script_tag.id,
        pixelId,
        shop,
      })
    } catch (apiError: any) {
      console.error(`❌ [Install Script Tag] Shopify API error:`, apiError.response?.data || apiError.message)

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create script tag in Shopify",
          details: apiError.response?.data || apiError.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error installing script tag:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
