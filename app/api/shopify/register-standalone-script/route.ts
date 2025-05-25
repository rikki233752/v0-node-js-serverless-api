import { NextResponse } from "next/server"
import { shopifyAdmin } from "@/lib/shopify"
import { getShopAccessToken } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { shop } = await request.json()

    if (!shop) {
      return NextResponse.json({ success: false, error: "Missing shop parameter" }, { status: 400 })
    }

    console.log(`Registering standalone script for shop: ${shop}`)

    // Get access token
    const accessToken = await getShopAccessToken(shop)

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "No access token found for shop" }, { status: 400 })
    }

    // Create Shopify admin client
    const client = shopifyAdmin(shop)

    // Create script tag
    const scriptTagResponse = await client.post({
      path: "script_tags",
      data: {
        script_tag: {
          event: "onload",
          src: `https://${process.env.VERCEL_URL || "v0-node-js-serverless-api-lake.vercel.app"}/standalone-pixel.js`,
          display_scope: "online_store",
        },
      },
    })

    const scriptTagData = await scriptTagResponse.json()

    return NextResponse.json({
      success: true,
      message: "Script tag created successfully",
      scriptTag: scriptTagData.script_tag,
    })
  } catch (error) {
    console.error("Error registering standalone script:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
