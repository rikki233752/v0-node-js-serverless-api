import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// OAuth callback endpoint
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const shop = url.searchParams.get("shop")
    const state = url.searchParams.get("state")
    const hmac = url.searchParams.get("hmac")

    console.log("🔐 OAuth callback received:", { shop, code: code ? "✓" : "✗", state: state ? "✓" : "✗" })

    // Basic validation
    if (!shop || !code) {
      console.error("❌ Missing required parameters")
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=missing_params`)
    }

    // Extract pixel ID from state if provided
    let pixelId = null
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, "base64").toString())
        pixelId = decodedState.pixelId
        console.log("📊 Pixel ID from state:", pixelId)
      } catch (e) {
        console.log("⚠️ Could not parse state, might be legacy format")
      }
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      console.error("❌ Failed to get access token:", await tokenResponse.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=token_exchange`)
    }

    const { access_token } = await tokenResponse.json()
    console.log("✅ Access token received")

    // Clean shop domain
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    // Store shop data in database
    try {
      // Store shop auth data
      await prisma.shopAuth.upsert({
        where: { shop: cleanShop },
        update: {
          accessToken: access_token,
          installed: true,
        },
        create: {
          shop: cleanShop,
          accessToken: access_token,
          scopes: process.env.SHOPIFY_SCOPES || "",
          installed: true,
        },
      })
      console.log("✅ Shop auth data stored")

      // Create or update pixel config if we have a pixel ID
      let pixelConfigId = null
      if (pixelId) {
        const pixelConfig = await prisma.pixelConfig.upsert({
          where: { pixelId },
          update: {},
          create: {
            pixelId,
            name: `Pixel for ${cleanShop}`,
          },
        })
        pixelConfigId = pixelConfig.id
        console.log("✅ Pixel config created/updated:", pixelConfig.id)
      }

      // Create or update shop config
      await prisma.shopConfig.upsert({
        where: { shopDomain: cleanShop },
        update: {
          updatedAt: new Date(),
          ...(pixelConfigId ? { pixelConfigId } : {}),
        },
        create: {
          shopDomain: cleanShop,
          gatewayEnabled: !!pixelConfigId,
          ...(pixelConfigId ? { pixelConfigId } : {}),
        },
      })
      console.log("✅ Shop config created/updated")
    } catch (dbError) {
      console.error("❌ Database error:", dbError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=database`)
    }

    // Activate Web Pixel
    try {
      // Create Web Pixel settings
      const settings = {
        accountID: pixelId || process.env.FACEBOOK_PIXEL_ID || "584928510540140",
        pixelId: pixelId || process.env.FACEBOOK_PIXEL_ID || "584928510540140",
        gatewayUrl: `${process.env.NEXT_PUBLIC_HOST || ""}/api/track`,
        debug: true,
      }

      // Create Web Pixel
      const endpoint = `https://${shop}/admin/api/2023-10/graphql.json`
      const mutation = `
        mutation webPixelCreate($webPixel: WebPixelInput!) {
          webPixelCreate(webPixel: $webPixel) {
            userErrors { message }
            webPixel { id settings }
          }
        }
      `

      const pixelResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": access_token,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            webPixel: {
              settings: JSON.stringify(settings),
            },
          },
        }),
      })

      const pixelResult = await pixelResponse.json()
      console.log("✅ Web Pixel creation result:", JSON.stringify(pixelResult))
    } catch (pixelError) {
      console.error("⚠️ Web Pixel activation error:", pixelError)
      // Continue even if Web Pixel activation fails
    }

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_HOST || ""}/auth/success?shop=${encodeURIComponent(cleanShop)}`,
    )
  } catch (error) {
    console.error("💥 OAuth callback error:", error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=unknown`)
  }
}
