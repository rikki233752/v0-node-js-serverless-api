import { NextResponse } from "next/server"

// Add CORS headers to fix the preflight request issue
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Forwarded-For, User-Agent, Origin, Referer",
  "Access-Control-Max-Age": "86400", // 24 hours
}

export async function POST(request: Request) {
  const body = await request.json()

  // Extract shop domain from the current URL
  const extractShopFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()

      // Check if it's a myshopify.com domain
      if (hostname.endsWith(".myshopify.com")) {
        return hostname
      }

      // Check if it's a custom domain - look up in database
      // This would require a reverse lookup in your shop configurations
      return hostname
    } catch (error) {
      console.error("Error extracting shop from URL:", error)
      return null
    }
  }

  const shopDomain = body.shop || extractShopFromUrl(body.currentUrl)

  if (!shopDomain) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not determine shop domain",
        currentUrl: body.currentUrl,
      },
      { status: 400, headers: corsHeaders },
    )
  }

  console.log("🏪 [Detect Pixel] Resolved shop domain:", shopDomain)

  try {
    // Placeholder for pixel detection logic
    console.log("Pixel detection logic would be implemented here.")

    return NextResponse.json(
      {
        success: true,
        shop: shopDomain,
        message: "Pixel detection request received",
      },
      { headers: corsHeaders },
    )
  } catch (error: any) {
    console.error("Pixel detection error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
