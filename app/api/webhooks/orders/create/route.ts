import { NextResponse } from "next/server"
import { headers } from "next/headers"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const headersList = headers()

    // Verify webhook authenticity
    const hmacHeader = headersList.get("x-shopify-hmac-sha256")
    const shopDomain = headersList.get("x-shopify-shop-domain")

    if (!hmacHeader || !shopDomain) {
      return NextResponse.json({ error: "Missing required headers" }, { status: 400 })
    }

    // Verify HMAC
    const calculatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
      .update(body, "utf8")
      .digest("base64")

    if (calculatedHmac !== hmacHeader) {
      return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 })
    }

    const order = JSON.parse(body)

    console.log("Order created webhook received:", {
      orderId: order.id,
      orderNumber: order.order_number,
      totalPrice: order.total_price,
      shop: shopDomain,
    })

    // Send Facebook Pixel Purchase event
    if (process.env.FACEBOOK_PIXEL_ID && process.env.FACEBOOK_ACCESS_TOKEN) {
      try {
        const pixelData = {
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              action_source: "website",
              event_source_url: `https://${shopDomain}`,
              user_data: {
                em: order.email
                  ? [crypto.createHash("sha256").update(order.email.toLowerCase()).digest("hex")]
                  : undefined,
                ph: order.phone ? [crypto.createHash("sha256").update(order.phone).digest("hex")] : undefined,
              },
              custom_data: {
                currency: order.currency,
                value: Number.parseFloat(order.total_price),
                order_id: order.id.toString(),
                content_ids: order.line_items?.map((item: any) => item.product_id?.toString()).filter(Boolean) || [],
                content_type: "product",
                num_items: order.line_items?.length || 0,
              },
            },
          ],
        }

        const pixelResponse = await fetch(`https://graph.facebook.com/v18.0/${process.env.FACEBOOK_PIXEL_ID}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...pixelData,
            access_token: process.env.FACEBOOK_ACCESS_TOKEN,
          }),
        })

        const pixelResult = await pixelResponse.json()
        console.log("Facebook Pixel event sent:", pixelResult)
      } catch (pixelError) {
        console.error("Error sending Facebook Pixel event:", pixelError)
      }
    }

    return NextResponse.json({ success: true, message: "Order webhook processed" })
  } catch (error) {
    console.error("Error processing order webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
