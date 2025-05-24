import { NextResponse } from "next/server"

// Function to detect Facebook Pixel on any website
async function detectFacebookPixel(url: string): Promise<string[] | null> {
  try {
    console.log("🔍 [Public Detection] Scanning website for Facebook Pixel:", url)

    // Ensure URL has protocol
    if (!url.startsWith("http")) {
      url = `https://${url}`
    }

    try {
      console.log("🌐 [Public Detection] Fetching URL:", url)

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FacebookPixelDetector/1.0)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 15000,
        redirect: "follow",
      })

      if (!response.ok) {
        console.log("⚠️ [Public Detection] URL failed:", url, response.status)
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      console.log("✅ [Public Detection] HTML fetched, length:", html.length)

      // Look for Facebook Pixel patterns
      const pixelPatterns = [
        // fbq('init', 'PIXEL_ID')
        /fbq\s*\(\s*['"]init['"],\s*['"](\d+)['"]/gi,
        // Facebook Pixel script with pixel ID
        /facebook\.net\/tr\?id=(\d+)/gi,
        // Meta Pixel patterns
        /meta-pixel['"]\s*content=['"](\d+)['"]/gi,
        // Data-pixel-id attributes
        /data-pixel-id=['"](\d+)['"]/gi,
        // Facebook pixel in script tags
        /_fbp.*?(\d{15,})/gi,
        // Connect.facebook.net patterns
        /connect\.facebook\.net.*?(\d{15,})/gi,
      ]

      const detectedPixels = new Set<string>()

      for (const pattern of pixelPatterns) {
        let match
        const patternCopy = new RegExp(pattern.source, pattern.flags) // Create a fresh copy of the regex
        while ((match = patternCopy.exec(html)) !== null) {
          const pixelId = match[1]
          if (pixelId && pixelId.length >= 10 && /^\d+$/.test(pixelId)) {
            detectedPixels.add(pixelId)
            console.log("🎯 [Public Detection] Found pixel ID:", pixelId, "via pattern:", pattern.source)
          }
        }
      }

      if (detectedPixels.size > 0) {
        const detectedPixelArray = Array.from(detectedPixels)
        console.log("✅ [Public Detection] Pixels detected:", detectedPixelArray)
        return detectedPixelArray
      } else {
        console.log("❌ [Public Detection] No Facebook Pixel found")
        return []
      }
    } catch (urlError) {
      console.log("❌ [Public Detection] Error with URL:", url, urlError.message)
      throw urlError
    }
  } catch (error) {
    console.error("💥 [Public Detection] Error:", error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ success: false, error: "URL parameter required" }, { status: 400 })
    }

    console.log("🔍 [Public] Pixel detection for URL:", url)

    // Detect pixel on website
    const detectedPixels = await detectFacebookPixel(url)

    if (!detectedPixels) {
      return NextResponse.json({
        success: false,
        error: "Error scanning website",
        url: url,
      })
    }

    return NextResponse.json({
      success: true,
      url: url,
      detectedPixels: detectedPixels,
      pixelsFound: detectedPixels.length,
    })
  } catch (error) {
    console.error("💥 [Public] Detection error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        url: error.url || null,
      },
      { status: 500 },
    )
  }
}
