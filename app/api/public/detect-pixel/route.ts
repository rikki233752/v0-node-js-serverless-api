import { type NextRequest, NextResponse } from "next/server"
import fetch from "node-fetch"

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    // Fetch the website content
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch website: ${response.status} ${response.statusText}` },
        { status: 400 },
      )
    }

    const html = await response.text()

    // Enhanced patterns to detect Facebook Pixel IDs
    const patterns = [
      // Standard fbq init calls with different quote styles
      /fbq\(\s*['"]init['"],\s*['"]([\d]+)['"]/g,
      /fbq\(\s*["']init["'],\s*["']([\d]+)["']/g,
      /fbq\(\s*[`]init[`],\s*[`]([\d]+)[`]/g,

      // Minified versions
      /fbq\(['"]init['"],['"](\d+)['"]/g,

      // Config objects
      /pixel_id['"]\s*:\s*['"]([\d]+)['"]/gi,
      /pixelId['"]\s*:\s*['"]([\d]+)['"]/gi,
      /pixel_id\s*:\s*['"]([\d]+)['"]/gi,
      /pixelId\s*:\s*['"]([\d]+)['"]/gi,

      // Script src patterns
      /connect\.facebook\.net\/en_US\/fbevents\.js#xfbml=1&version=v\d+\.\d+&appId=\d+&autoLogAppEvents=1&id=([\d]+)/g,

      // Data attributes
      /data-pixel-id=['"]([\d]+)['"]/g,

      // Shopify specific patterns
      /trekkie\.push\(\s*\[\s*['"]identify['"]\s*,\s*['"]([\d]+)['"]/g,

      // JSON config patterns
      /"facebook_pixel_id"\s*:\s*"([\d]+)"/g,
      /'facebook_pixel_id'\s*:\s*'([\d]+)'/g,

      // General number near Facebook references (with validation)
      /facebook[^>]*?(\d{15,16})/gi,
      /pixel[^>]*?(\d{15,16})/gi,
      /fbq[^>]*?(\d{15,16})/gi,
    ]

    const detectedPixels = new Set<string>()

    // Apply each pattern and collect unique pixel IDs
    patterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(html)) !== null) {
        const pixelId = match[1]
        // Validate: Facebook Pixel IDs are typically 15-16 digits
        if (/^\d{15,16}$/.test(pixelId)) {
          detectedPixels.add(pixelId)
        }
      }
    })

    return NextResponse.json({
      url: normalizedUrl,
      pixelsFound: detectedPixels.size,
      detectedPixels: Array.from(detectedPixels),
      success: true,
    })
  } catch (error) {
    console.error("Pixel detection error:", error)
    return NextResponse.json(
      { error: "Failed to detect pixel: " + (error.message || "Unknown error") },
      { status: 500 },
    )
  }
}
