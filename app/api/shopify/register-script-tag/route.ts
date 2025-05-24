import { NextResponse } from "next/server"
import { getShopData } from "@/lib/db-auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { shop, pixelId } = body

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    const shopData = await getShopData(shop)

    if (!shopData) {
      return NextResponse.json({ error: "Shop not found in database" }, { status: 404 })
    }

    // Check if script tags scope is available
    const shopScopes = shopData.scopes ? shopData.scopes.split(",").map((s) => s.trim()) : []
    if (!shopScopes.includes("write_script_tags")) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing write_script_tags scope. Please reinstall the app with proper permissions.",
        },
        { status: 400 },
      )
    }

    // Check existing script tags
    const existingResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      headers: {
        "X-Shopify-Access-Token": shopData.accessToken,
      },
    })

    if (existingResponse.ok) {
      const existingData = await existingResponse.json()
      const existingTag = existingData.script_tags?.find(
        (tag) => tag.src?.includes("facebook-pixel-gateway") || tag.src?.includes("/api/track"),
      )

      if (existingTag) {
        return NextResponse.json({
          success: true,
          scriptTag: existingTag,
          message: "Script tag already exists",
          alreadyExists: true,
        })
      }
    }

    // Create the script tag
    const gatewayUrl = process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"

    const scriptTagData = {
      script_tag: {
        event: "onload",
        src: `${gatewayUrl}/client-script.js`,
        display_scope: "all",
      },
    }

    const response = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopData.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scriptTagData),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({
        success: true,
        scriptTag: result.script_tag,
        message: "Script tag registered successfully",
        note: "This will inject Facebook Pixel tracking code into your store pages.",
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json(
        {
          success: false,
          error: "Failed to register script tag",
          details: errorText,
        },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("Error registering script tag:", error)
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
