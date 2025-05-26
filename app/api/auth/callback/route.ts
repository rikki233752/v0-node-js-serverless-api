import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"

// Helper function to extract Facebook Pixel ID from URL
function extractPixelIdFromUrl(url: string): string | null {
  // Match facebook.com/tr?id=PIXEL_ID or similar patterns
  const pixelIdRegex = /facebook\.com\/tr\?id=(\d{15,16})/i
  const match = url.match(pixelIdRegex)

  if (match && match[1]) {
    return match[1]
  }

  // Try alternative pattern with id as a parameter anywhere in the URL
  const altPixelIdRegex = /[?&]id=(\d{15,16})/i
  const altMatch = url.match(altPixelIdRegex)

  if (altMatch && altMatch[1]) {
    return altMatch[1]
  }

  return null
}

// Clean and normalize shop domain
function cleanShopDomain(shop: string): string {
  return shop
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase()
    .trim()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    // Validate shop parameter
    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop parameter is required" }, { status: 400 })
    }

    console.log(`🔐 Processing callback for shop: ${shop}`)

    // Clean and normalize the shop domain
    const cleanShop = cleanShopDomain(shop)

    // Validate shop domain format
    if (!cleanShop.includes(".myshopify.com") && !cleanShop.includes(".")) {
      return NextResponse.json({ success: false, error: "Invalid shop domain format" }, { status: 400 })
    }

    // Check if shop is already configured with a pixel
    const existingShopConfig = await prisma.shopConfig.findUnique({
      where: { shopDomain: cleanShop },
      include: { pixelConfig: true },
    })

    // If shop already has a pixel configuration and gateway is enabled, return early
    if (existingShopConfig?.pixelConfigId && existingShopConfig.gatewayEnabled) {
      console.log(`✅ Shop ${cleanShop} already configured with Pixel ID ${existingShopConfig.pixelConfig?.pixelId}`)

      return NextResponse.json({
        success: true,
        shop: cleanShop,
        pixelId: existingShopConfig.pixelConfig?.pixelId,
        configurationStatus: "already-linked",
      })
    }

    console.log(`🔍 Launching Puppeteer to detect Facebook Pixel for ${cleanShop}...`)

    // Set up Puppeteer with Chrome AWS Lambda for serverless environments
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    })

    let pixelId: string | null = null

    try {
      const page = await browser.newPage()

      // Set up request interception to monitor network requests
      await page.setRequestInterception(true)

      // Monitor network requests for Facebook Pixel
      page.on("request", (request) => {
        const url = request.url()

        // Check if this is a Facebook Pixel request
        if (url.includes("facebook.com/tr") || url.includes("facebook.net")) {
          console.log(`🔍 Detected potential Facebook request: ${url}`)

          const detectedPixelId = extractPixelIdFromUrl(url)
          if (detectedPixelId) {
            console.log(`🎯 Found Facebook Pixel ID: ${detectedPixelId}`)
            pixelId = detectedPixelId
          }
        }

        // Continue the request
        request.continue()
      })

      // Set a timeout for the navigation
      const navigationTimeout = 15000 // 15 seconds

      // Navigate to the shop
      console.log(`🌐 Navigating to https://${cleanShop}...`)
      await page.goto(`https://${cleanShop}`, {
        waitUntil: "networkidle2",
        timeout: navigationTimeout,
      })

      // If no pixel found in network requests, try to extract from page content
      if (!pixelId) {
        console.log(`🔍 Checking page content for Facebook Pixel...`)

        // Execute script in the page context to find pixel ID
        pixelId = await page.evaluate(() => {
          // Check for fbq('init', 'PIXEL_ID')
          const fbqMatch = document.body.innerHTML.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{15,16})['"]/i)
          if (fbqMatch) return fbqMatch[1]

          // Check for meta pixel in script tags
          const scripts = document.querySelectorAll("script")
          for (const script of scripts) {
            const content = script.textContent || script.innerText
            if (!content) continue

            // Check for various patterns
            const patterns = [
              /fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d{15,16})['"]/i,
              /"facebook_pixel_id"\s*:\s*["']?(\d{15,16})["']?/i,
              /shopify\.analytics\.meta_pixel_id\s*=\s*["']?(\d{15,16})["']?/i,
            ]

            for (const pattern of patterns) {
              const match = content.match(pattern)
              if (match && match[1]) return match[1]
            }
          }

          return null
        })

        if (pixelId) {
          console.log(`🎯 Found Facebook Pixel ID in page content: ${pixelId}`)
        }
      }
    } finally {
      // Always close the browser
      await browser.close()
      console.log(`🔒 Puppeteer browser closed`)
    }

    // Process the result
    if (pixelId) {
      console.log(`✅ Successfully detected Pixel ID ${pixelId} for shop ${cleanShop}`)

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
      await prisma.shopConfig.upsert({
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
        success: false,
        shop: cleanShop,
        pixelId: null,
        configurationStatus: "shop_exists_no_pixel",
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
