import { NextResponse } from "next/server"
import crypto from "crypto"
import axios from "axios"
import { prisma } from "@/lib/db"

// Verify the HMAC signature from Shopify
function verifyHmac(query: URLSearchParams): boolean {
  const hmac = query.get("hmac")
  if (!hmac) return false

  // Remove hmac from the parameters
  query.delete("hmac")

  // Create a string of key=value pairs sorted alphabetically
  const message = Array.from(query.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")

  // Calculate the HMAC using your app's secret key
  const calculatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET || "")
    .update(message)
    .digest("hex")

  // Compare the calculated HMAC with the one from the query
  return crypto.timingSafeEqual(Buffer.from(calculatedHmac), Buffer.from(hmac))
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams

    // 1. Verify the request is from Shopify
    if (!verifyHmac(new URLSearchParams(query.toString()))) {
      return NextResponse.json({ error: "Invalid HMAC. Request could not be verified" }, { status: 403 })
    }

    // 2. Extract parameters
    const shop = query.get("shop")
    const code = query.get("code")

    if (!shop || !code) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // 3. Exchange temporary code for a permanent access token
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    })

    const { access_token, scope } = tokenResponse.data

    // 4. Store the access token in your database
    await prisma.shopifyStore.upsert({
      where: { domain: shop },
      update: {
        accessToken: access_token,
        scope: scope,
      },
      create: {
        domain: shop,
        accessToken: access_token,
        scope: scope,
        isActive: true,
      },
    })

    // 5. Redirect to the app in the merchant's admin
    const redirectUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.json({ error: "Failed to complete OAuth" }, { status: 500 })
  }
}
