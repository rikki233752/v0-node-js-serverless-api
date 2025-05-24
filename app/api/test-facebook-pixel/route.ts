import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { eventType, testData } = body

    if (!process.env.FACEBOOK_PIXEL_ID || !process.env.FACEBOOK_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          error: "Facebook Pixel credentials not configured",
          details: "Please set FACEBOOK_PIXEL_ID and FACEBOOK_ACCESS_TOKEN environment variables",
        },
        { status: 400 },
      )
    }

    // Create test event data based on event type
    let pixelData
    const currentTime = Math.floor(Date.now() / 1000)

    switch (eventType) {
      case "Purchase":
        pixelData = {
          data: [
            {
              event_name: "Purchase",
              event_time: currentTime,
              action_source: "website",
              event_source_url: "https://test-store.example.com",
              user_data: {
                em: testData?.email
                  ? [crypto.createHash("sha256").update(testData.email.toLowerCase()).digest("hex")]
                  : [crypto.createHash("sha256").update("test@example.com").digest("hex")],
                ph: testData?.phone ? [crypto.createHash("sha256").update(testData.phone).digest("hex")] : undefined,
              },
              custom_data: {
                currency: testData?.currency || "USD",
                value: testData?.value || 99.99,
                order_id: testData?.orderId || `test_order_${Date.now()}`,
                content_ids: testData?.productIds || ["test_product_123"],
                content_type: "product",
                num_items: testData?.numItems || 1,
              },
            },
          ],
        }
        break

      case "InitiateCheckout":
        pixelData = {
          data: [
            {
              event_name: "InitiateCheckout",
              event_time: currentTime,
              action_source: "website",
              event_source_url: "https://test-store.example.com",
              user_data: {
                em: testData?.email
                  ? [crypto.createHash("sha256").update(testData.email.toLowerCase()).digest("hex")]
                  : [crypto.createHash("sha256").update("test@example.com").digest("hex")],
              },
              custom_data: {
                currency: testData?.currency || "USD",
                value: testData?.value || 99.99,
                content_ids: testData?.productIds || ["test_product_123"],
                content_type: "product",
                num_items: testData?.numItems || 1,
              },
            },
          ],
        }
        break

      case "ViewContent":
        pixelData = {
          data: [
            {
              event_name: "ViewContent",
              event_time: currentTime,
              action_source: "website",
              event_source_url: "https://test-store.example.com",
              user_data: {
                em: testData?.email
                  ? [crypto.createHash("sha256").update(testData.email.toLowerCase()).digest("hex")]
                  : [crypto.createHash("sha256").update("test@example.com").digest("hex")],
              },
              custom_data: {
                currency: testData?.currency || "USD",
                value: testData?.value || 99.99,
                content_ids: testData?.productIds || ["test_product_123"],
                content_type: "product",
              },
            },
          ],
        }
        break

      default:
        return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    // Send to Facebook Pixel
    const pixelResponse = await fetch(`https://graph.facebook.com/v18.0/${process.env.FACEBOOK_PIXEL_ID}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...pixelData,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
        test_event_code: process.env.FACEBOOK_TEST_EVENT_CODE, // Optional: for testing
      }),
    })

    const pixelResult = await pixelResponse.json()

    if (!pixelResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Facebook Pixel API error",
          details: pixelResult,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `${eventType} event sent successfully`,
      pixelResponse: pixelResult,
      eventData: pixelData,
    })
  } catch (error) {
    console.error("Test Facebook Pixel error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
