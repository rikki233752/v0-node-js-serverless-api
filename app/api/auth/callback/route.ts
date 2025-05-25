import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Helper function to extract Facebook Pixel ID from HTML
function extractFacebookPixelId(html: string): string | null {
  // Define all regex patterns to search for Facebook Pixel ID
  const patterns = [
    // fbq('init', 'PIXEL_ID')
    /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{15,16})['"]/gi,

    // facebook.net/tr?id=PIXEL_ID
    /facebook\.net\/tr\?id=(\d{15,16})/gi,

    // facebook.net/.*?id=PIXEL_ID (more general pattern)
    /facebook\.net\/[^?]*\?[^#]*id=(\d{15,16})/gi,

    // <meta name="meta-pixel" content="PIXEL_ID">
    /<meta[^>]+name=["']?meta-pixel["']?[^>]+content=["']?(\d{15,16})["']?/gi,

    // data-pixel-id="PIXEL_ID"
    /data-pixel-id=["']?(\d{15,16})["']?/gi,

    // "facebook_pixel_id": "PIXEL_ID"
    /"facebook_pixel_id"\s*:\s*["']?(\d{15,16})["']?/gi,

    // shopify.analytics.meta_pixel_id = "PIXEL_ID"
    /shopify\.analytics\.meta_pixel_id\s*=\s*["']?(\d{15,16})["']?/gi,

    // gtm: "PIXEL_ID" (in various contexts)
    /gtm[^"']*["']?\s*:\s*["']?(\d{15,16})["']?/gi,
  ]

  // Try each pattern and return the first match found
  for (const pattern of patterns) {
    pattern.lastIndex = 0 // Reset regex state
    const match = pattern.exec(html)
    if (match && match[1]) {
      console.log(`✅ Found Pixel ID using pattern: ${pattern.source}`)
      return match[1]
    }
  }

  // If no match found, try a more general pattern for any 15-16 digit number that looks like a pixel ID
  const generalPattern = /(?:pixel[_-]?id|fbq|facebook)[^0-9]*(\d{15,16})/gi
  const generalMatch = generalPattern.exec(html)
  if (generalMatch && generalMatch[1]) {
    console.log(`✅ Found Pixel ID using general pattern`)
    return generalMatch[1]
  }

  return null
}

// Check if store is password protected
function isPasswordProtected(html: string): boolean {
  const passwordPatterns = [
    /<form[^>]*password/i,
    /store.password-page/i,
    /password-required/i,
    /password-template/i,
    /password protection/i,
    /This store is password protected/i,
  ]

  return passwordPatterns.some((pattern) => pattern.test(html))
}

// Try to fetch from admin API if available
async function tryAdminApiFetch(shop: string, accessToken?: string): Promise<string | null> {
  if (!accessToken) {
    console.log("⚠️ No access token available for admin API fetch")
    return null
  }

  try {
    console.log(`🔍 Attempting to fetch pixel ID via Admin API for ${shop}`)
    // This is a placeholder - implement actual Admin API call based on your setup
    // const response = await fetch(`https://${shop}/admin/api/2023-07/shop.json`, {
    //   headers: {
    //     'X-Shopify-Access-Token': accessToken
    //   }
    // })
    // const data = await response.json()
    // Look for pixel ID in shop metadata or preferences
    return null // Replace with actual implementation
  } catch (error) {
    console.error("❌ Admin API fetch failed:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")
    const accessToken = searchParams.get("accessToken") || undefined

    // Validate shop parameter
    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop parameter is required" }, { status: 400 })
    }

    console.log(`🔐 Processing callback for shop: ${shop}`)

    // Clean and normalize the shop domain
    const cleanShop = shop
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase()
      .trim()

    // Validate shop domain format
    if (!cleanShop.includes(".myshopify.com") && !cleanShop.includes(".")) {
      return NextResponse.json({ success: false, error: "Invalid shop domain format" }, { status: 400 })
    }

    try {
      // Fetch the storefront HTML
      console.log(`🔍 Fetching storefront HTML from https://${cleanShop}`)

      const response = await fetch(`https://${cleanShop}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        console.error(`❌ Failed to fetch storefront: ${response.status} ${response.statusText}`)
        throw new Error(`Failed to fetch storefront: ${response.status}`)
      }

      const html = await response.text()
      console.log(`📄 Fetched ${html.length} characters of HTML`)

      // Check if store is password protected
      const passwordProtected = isPasswordProtected(html)
      if (passwordProtected) {
        console.log(`🔒 Store is password protected: ${cleanShop}`)

        // Try admin API if we have access token
        const adminPixelId = await tryAdminApiFetch(cleanShop, accessToken)
        if (adminPixelId) {
          console.log(`🎯 Found Facebook Pixel ID via Admin API: ${adminPixelId}`)
          // Process this pixel ID (same code as below)
          // ...

          return NextResponse.json({
            success: true,
            shop: cleanShop,
            pixelId: adminPixelId,
            configurationStatus: "linked",
            note: "Pixel ID found via Admin API (store is password protected)",
          })
        }

        // Create/update shop config without pixel
        await prisma.shopConfig.upsert({
          where: { shopDomain: cleanShop },
          update: {
            gatewayEnabled: false,
          },
          create: {
            shopDomain: cleanShop,
            gatewayEnabled: false,
          },
        })

        return NextResponse.json({
          success: true,
          shop: cleanShop,
          pixelId: null,
          configurationStatus: "shop_exists_no_pixel",
          passwordProtected: true,
          message: "Store is password protected. Please provide pixel ID manually or remove password protection.",
        })
      }

      // Extract Facebook Pixel ID
      const pixelId = extractFacebookPixelId(html)

      if (pixelId) {
        console.log(`🎯 Found Facebook Pixel ID: ${pixelId}`)

        // Check if PixelConfig already exists
        let pixelConfig = await prisma.pixelConfig.findUnique({
          where: { pixelId },
        })

        // If pixel doesn't exist, create it
        if (!pixelConfig) {
          console.log(`📝 Creating new PixelConfig for Pixel ID: ${pixelId}`)
          pixelConfig = await prisma.pixelConfig.create({
            data: {
              pixelId,
              accessToken: "PENDING_CONFIGURATION",
              name: `Auto-detected pixel for ${cleanShop}`,
            },
          })
        } else {
          console.log(`📋 Using existing PixelConfig for Pixel ID: ${pixelId}`)
        }

        // Upsert ShopConfig with pixel configuration
        const shopConfig = await prisma.shopConfig.upsert({
          where: { shopDomain: cleanShop },
          update: {
            pixelConfigId: pixelConfig.id,
            gatewayEnabled: true,
          },
          create: {
            shopDomain: cleanShop,
            pixelConfigId: pixelConfig.id,
            gatewayEnabled: true,
          },
        })

        console.log(`✅ Successfully linked shop ${cleanShop} to Pixel ID ${pixelId}`)

        return NextResponse.json({
          success: true,
          shop: cleanShop,
          pixelId,
          configurationStatus: "linked",
        })
      } else {
        console.log(`⚠️ No Facebook Pixel ID found for shop ${cleanShop}`)

        // Upsert ShopConfig without pixel configuration
        await prisma.shopConfig.upsert({
          where: { shopDomain: cleanShop },
          update: {
            pixelConfigId: null,
            gatewayEnabled: false,
          },
          create: {
            shopDomain: cleanShop,
            pixelConfigId: null,
            gatewayEnabled: false,
          },
        })

        return NextResponse.json({
          success: true,
          shop: cleanShop,
          pixelId: null,
          configurationStatus: "shop_exists_no_pixel",
        })
      }
    } catch (fetchError) {
      console.error(`💥 Error fetching storefront:`, fetchError)

      // Still create/update shop config even if fetch fails
      await prisma.shopConfig.upsert({
        where: { shopDomain: cleanShop },
        update: {
          gatewayEnabled: false,
        },
        create: {
          shopDomain: cleanShop,
          gatewayEnabled: false,
        },
      })

      return NextResponse.json({
        success: false,
        shop: cleanShop,
        pixelId: null,
        configurationStatus: "shop_exists_no_pixel",
        error: fetchError instanceof Error ? fetchError.message : "Failed to fetch storefront",
      })
    }
  } catch (error) {
    console.error("💥 Callback error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
