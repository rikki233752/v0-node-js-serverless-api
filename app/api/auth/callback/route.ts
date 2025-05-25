import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { activateWebPixel } from "@/lib/shopify-graphql"
import { validateHmac, getAccessToken } from "@/lib/shopify"
import { storeShopData } from "@/lib/db-auth"

// Function to detect Facebook Pixel ID from a website
async function detectFacebookPixel(url: string): Promise<string | null> {
  try {
    console.log(`🔍 Attempting to detect Facebook Pixel ID from ${url}`)

    // Fetch the website HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      console.log(`❌ Failed to fetch website: ${response.status} ${response.statusText}`)
      return null
    }

    const html = await response.text()

    // Common patterns for Facebook Pixel ID
    const patterns = [
      /fbq\s*\(\s*['"]init['"],\s*['"](\d+)['"]/i, // fbq('init', '123456789')
      /fbq\s*\(\s*["']init["'],\s*["'](\d+)["']/i, // fbq("init", "123456789")
      /pixel_id\s*[:=]\s*['"](\d+)['"]/i, // pixel_id: '123456789'
      /pixelId\s*[:=]\s*['"](\d+)['"]/i, // pixelId: '123456789'
      /<meta[^>]*content=["'](\d{15,16})["'][^>]*property=["']fb:app_id["']/i, // Meta tag
      /facebook\.com\/tr\?id=(\d+)/i, // facebook.com/tr?id=123456789
      /connect\.facebook\.net\/en_US\/fbevents\.js[^>]+id=(\d+)/i, // connect.facebook.net/en_US/fbevents.js?id=123456789
    ]

    // Try each pattern
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        console.log(`✅ Detected Facebook Pixel ID: ${match[1]} using pattern: ${pattern}`)
        return match[1]
      }
    }

    console.log(`❌ No Facebook Pixel ID detected in website HTML`)
    return null
  } catch (error) {
    console.error(`❌ Error detecting Facebook Pixel ID:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const shop = url.searchParams.get("shop")
    const state = url.searchParams.get("state")
    const hmac = url.searchParams.get("hmac")

    console.log("OAuth callback received:", { shop, code: code ? "✓" : "✗", state: state ? "✓" : "✗" })

    if (!shop || !code || !hmac) {
      console.error("Missing required parameters:", { shop, code: code ? "✓" : "✗", hmac: hmac ? "✓" : "✗" })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=missing_params`)
    }

    // Verify HMAC
    if (!validateHmac(request)) {
      console.error("HMAC validation failed")
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=invalid_hmac`)
    }

    // Parse state parameter for pixel ID
    let pixelId = null
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, "base64").toString())
        pixelId = decodedState.pixelId
        console.log("Extracted pixel ID from state:", pixelId)
      } catch (e) {
        console.error("Failed to parse state parameter:", e)
      }
    }

    // Exchange code for access token
    const accessToken = await getAccessToken(shop, code)
    if (!accessToken) {
      console.error("Failed to get access token")
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=token_exchange`)
    }

    // Clean up shop domain
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()

    console.log("Storing access token for shop:", cleanShop)

    // If no pixel ID provided, try to detect it
    if (!pixelId) {
      try {
        console.log("No pixel ID provided, attempting to detect from shop website")
        pixelId = await detectFacebookPixel(`https://${cleanShop}`)
        console.log("Pixel detection result:", pixelId)
      } catch (error) {
        console.error("Error detecting pixel:", error)
      }
    }

    // Store shop data in database
    try {
      // Store shop auth data
      await storeShopData({
        shop: cleanShop,
        accessToken,
        scopes: process.env.SHOPIFY_SCOPES || "read_pixels,write_pixels,read_customer_events",
        installed: true,
      })

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
        console.log("Created/updated pixel config:", pixelConfig)
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
          ...(pixelConfigId ? { pixelConfigId } : {}),
        },
      })

      console.log("Shop data stored successfully")
    } catch (error) {
      console.error("Error storing shop data:", error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=database`)
    }

    // Activate Web Pixel
    try {
      console.log("Activating Web Pixel for shop:", cleanShop)
      const result = await activateWebPixel(cleanShop, accessToken, pixelId)
      console.log("Web Pixel activation result:", result)
    } catch (error) {
      console.error("Error activating Web Pixel:", error)
      // Continue even if Web Pixel activation fails
    }

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_HOST || ""}/auth/success?shop=${encodeURIComponent(cleanShop)}`,
    )
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST || ""}/auth/error?error=unknown`)
  }
}
