import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import crypto from "crypto"

// Verify webhook signature
function verifyWebhook(body: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET)
  hmac.update(body, "utf8")
  const hash = hmac.digest("base64")
  return hash === signature
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-shopify-hmac-sha256")

    if (!signature || !verifyWebhook(body, signature)) {
      console.error("Invalid webhook signature")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = JSON.parse(body)
    const shopDomain = request.headers.get("x-shopify-shop-domain")

    console.log("App uninstalled webhook received:", { shopDomain, data })

    if (shopDomain) {
      // Mark the shop as uninstalled
      await prisma.shopAuth.update({
        where: { shop: shopDomain },
        data: { installed: false },
      })

      console.log(`Marked shop ${shopDomain} as uninstalled`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing app uninstall webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
