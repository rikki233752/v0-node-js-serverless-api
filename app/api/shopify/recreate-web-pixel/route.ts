import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    console.log("🔄 [Recreate Web Pixel] Starting process...")

    // Get the shop domain from the request
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json(
        {
          success: false,
          error: "Shop domain is required",
        },
        { status: 400 },
      )
    }

    console.log(`🏪 [Recreate Web Pixel] Processing for shop: ${shop}`)

    // Find the shop configuration
    const shopConfig = await prisma.shopConfig.findFirst({
      where: { shopDomain: shop },
      include: { pixelConfig: true },
    })

    if (!shopConfig) {
      console.log(`❌ [Recreate Web Pixel] No shop configuration found for: ${shop}`)
      return NextResponse.json(
        {
          success: false,
          error: "Shop configuration not found",
        },
        { status: 404 },
      )
    }

    console.log(`✅ [Recreate Web Pixel] Found shop configuration for: ${shop}`)

    // Get the pixel ID
    const pixelId = shopConfig.pixelConfig?.pixelId || process.env.FACEBOOK_PIXEL_ID

    if (!pixelId) {
      console.log(`❌ [Recreate Web Pixel] No pixel ID found for: ${shop}`)
      return NextResponse.json(
        {
          success: false,
          error: "No pixel ID found",
        },
        { status: 404 },
      )
    }

    console.log(`🎯 [Recreate Web Pixel] Using pixel ID: ${pixelId}`)

    // Return success with the pixel ID
    return NextResponse.json({
      success: true,
      message: "Web Pixel recreation process initiated",
      pixelId,
      shop,
    })
  } catch (error) {
    console.error("Error recreating Web Pixel:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
