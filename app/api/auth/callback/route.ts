import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createShopifyAuth } from "@shopify/shopify-app-remix/server"
import { prisma } from "../../../../lib/prisma"

const shopify = createShopifyAuth({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SCOPES!.split(","),
  appUrl: process.env.APP_URL!,
  isEmbeddedApp: true,
  // This should be replaced with your preferred storage strategy
  sessionStorage: undefined as any, // Replace with your session storage
})

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get("shop")!
  const host = searchParams.get("host")!

  const { shopifyAuthUrl, shopState } = await shopify.getAuthUrl(shop, `/api/auth/tokens`, {
    // This should be the same as your app's URL
    appUrl: process.env.APP_URL!,
    // Optionally, include per-user authentication details as needed
    // user: {
    //   id: "some-user-id",
    //   accessToken: "some-user-token",
    //   email: "some-user-email",
    // },
  })

  cookies().set("shopState", shopState)

  // Auto-create shop configuration entry
  try {
    await prisma.shopConfig.upsert({
      where: { shopDomain: shop },
      update: {
        // Just update the timestamp if it exists
        updatedAt: new Date(),
      },
      create: {
        shopDomain: shop,
        gatewayEnabled: false, // Will be enabled when pixel is configured
        // pixelConfigId will be set when admin configures the pixel
      },
    })
    console.log("✅ [OAuth] Shop config entry created/updated for:", shop)
  } catch (error) {
    console.error("⚠️ [OAuth] Failed to create shop config entry:", error)
    // Don't fail the OAuth flow for this
  }

  return NextResponse.redirect(shopifyAuthUrl)
}
