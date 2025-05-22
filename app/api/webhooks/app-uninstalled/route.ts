import { NextResponse } from "next/server"
import { verifyShopifyRequest } from "@/lib/shopify"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    // Verify the request is from Shopify
    const isValid = await verifyShopifyRequest(request.clone())
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the shop domain from headers
    const shop = request.headers.get("x-shopify-shop-domain")
    if (!shop) {
      return NextResponse.json({ error: "Missing shop domain" }, { status: 400 })
    }

    // Update the store record to mark it as inactive
    await prisma.shopifyStore.update({
      where: { domain: shop },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("App uninstalled webhook error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
