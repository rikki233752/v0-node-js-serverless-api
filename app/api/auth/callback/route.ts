import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getShopByDomain, updateShopPixelId } from "@/utils/supabase"
import { detectFacebookPixel } from "@/utils/pixel-detect"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  // Get shop from request
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get("shop")

  if (shop) {
    // Exchange the code for the session
    const code = searchParams.get("code")
    if (code) {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error("Error exchanging code for session:", error)
          throw error
        }

        // Set the session cookie
        const { access_token, refresh_token } = data.session
        cookies().set("sb-access-token", access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
        })
        cookies().set("sb-refresh-token", refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
        })

        try {
          // Try to detect Facebook Pixel ID if not already done
          let pixelId = await detectFacebookPixel(shop)

          // If detection failed, check if we already have it in the database
          if (!pixelId) {
            console.log(`🔍 [OAuth Callback] Detection failed, checking database for existing pixel ID...`)
            const shopData = await getShopByDomain(shop)
            if (shopData && shopData.pixelId) {
              pixelId = shopData.pixelId
              console.log(`✅ [OAuth Callback] Found pixel ID in database: ${pixelId}`)
            } else {
              // Fall back to environment variable or default
              pixelId = process.env.FACEBOOK_PIXEL_ID || "584928510540140" // Default test pixel ID
              console.log(`⚠️ [OAuth Callback] Using fallback pixel ID: ${pixelId}`)
            }
          }

          // Update the shop with the pixel ID if it was detected
          if (pixelId) {
            console.log(`🔄 [OAuth Callback] Updating shop with pixel ID: ${pixelId}`)
            await updateShopPixelId(shop, pixelId)
          }

          // Prepare Web Pixel settings
          const settings = {
            accountID: pixelId,
            pixelId: pixelId,
            gatewayUrl: `${process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"}/api/track`,
            debug: true,
            timestamp: new Date().toISOString(),
          }

          // Log the settings
          console.log("Web Pixel Settings:", settings)
        } catch (error) {
          console.error("Error during pixel setup:", error)
        }

        // Redirect the user back to the app
        return NextResponse.redirect(new URL(`/?shop=${shop}`, request.url))
      } catch (error: any) {
        console.error("Error in OAuth callback:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: "No code provided" }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: "No shop provided" }, { status: 400 })
  }
}
