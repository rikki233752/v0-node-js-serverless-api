import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🎯 [Debug Web Pixel] Starting...")

  try {
    console.log("📝 [Debug Web Pixel] Step 1: Parsing request body...")
    const body = await request.json()
    console.log("📝 [Debug Web Pixel] Body:", body)

    console.log("📝 [Debug Web Pixel] Step 2: Extracting fields...")
    const { shop, accountID } = body
    console.log("📝 [Debug Web Pixel] Fields:", { shop, accountID })

    console.log("📝 [Debug Web Pixel] Step 3: Validation...")
    if (!shop || !accountID) {
      console.log("❌ [Debug Web Pixel] Validation failed")
      return NextResponse.json({
        success: false,
        error: "Missing shop or accountID",
        step: "validation",
      })
    }

    console.log("📝 [Debug Web Pixel] Step 4: Importing getShopAccessToken...")
    const { getShopAccessToken } = await import("@/lib/db")
    console.log("✅ [Debug Web Pixel] Import successful")

    console.log("📝 [Debug Web Pixel] Step 5: Getting access token...")
    const accessToken = await getShopAccessToken(shop)
    console.log("📝 [Debug Web Pixel] Access token result:", accessToken ? "found" : "not found")

    if (!accessToken) {
      console.log("❌ [Debug Web Pixel] No access token")
      return NextResponse.json({
        success: false,
        error: "No access token found",
        step: "access_token",
      })
    }

    console.log("📝 [Debug Web Pixel] Step 6: Importing shopifyAdmin...")
    const { shopifyAdmin } = await import("@/lib/shopify")
    console.log("✅ [Debug Web Pixel] Import successful")

    console.log("📝 [Debug Web Pixel] Step 7: Creating client...")
    const client = shopifyAdmin(shop)
    console.log("✅ [Debug Web Pixel] Client created")

    console.log("📝 [Debug Web Pixel] Step 8: Success!")
    return NextResponse.json({
      success: true,
      message: "Debug completed successfully",
      shop,
      accountID,
      hasAccessToken: !!accessToken,
      step: "complete",
    })
  } catch (error) {
    console.error("💥 [Debug Web Pixel] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Debug failed",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}
