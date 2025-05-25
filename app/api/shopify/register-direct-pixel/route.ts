import { NextResponse } from "next/server"
import { shopifyAdmin } from "@/lib/shopify"
import { getShopAccessToken } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { shop } = await request.json()

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing shop parameter",
        },
        { status: 400 },
      )
    }

    console.log(`🔧 [Register Direct Pixel] Registering script tag for shop: ${shop}`)

    // Get access token for the shop
    const accessToken = await getShopAccessToken(shop)

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No access token found for shop",
        },
        { status: 400 },
      )
    }

    // Create Shopify admin client
    const client = shopifyAdmin(shop)

    // Check if script tag already exists
    const existingScripts = await client.get({
      path: "script_tags",
      query: {
        src: `https://${process.env.VERCEL_URL || "v0-node-js-serverless-api-lake.vercel.app"}/direct-pixel.js`,
      },
    })

    const scriptTagsData = await existingScripts.json()

    if (scriptTagsData.script_tags && scriptTagsData.script_tags.length > 0) {
      console.log(`✅ [Register Direct Pixel] Script tag already exists for shop: ${shop}`)
      return NextResponse.json({
        success: true,
        message: "Script tag already exists",
        scriptTag: scriptTagsData.script_tags[0],
      })
    }

    // Create new script tag
    const scriptTagResponse = await client.post({
      path: "script_tags",
      data: {
        script_tag: {
          event: "onload",
          src: `https://${process.env.VERCEL_URL || "v0-node-js-serverless-api-lake.vercel.app"}/direct-pixel.js`,
          display_scope: "online_store",
        },
      },
    })

    const scriptTagData = await scriptTagResponse.json()

    console.log(`✅ [Register Direct Pixel] Script tag created for shop: ${shop}`, scriptTagData)

    return NextResponse.json({
      success: true,
      message: "Script tag created successfully",
      scriptTag: scriptTagData.script_tag,
    })
  } catch (error) {
    console.error("❌ [Register Direct Pixel] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
