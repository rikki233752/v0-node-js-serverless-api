import { NextResponse } from "next/server"
import { getShopData } from "@/lib/db-auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    const shopData = await getShopData(shop)

    if (!shopData) {
      return NextResponse.json({ error: "Shop not found in database" }, { status: 404 })
    }

    const gatewayUrl = process.env.HOST || "https://v0-node-js-serverless-api-lake.vercel.app"

    // Define webhooks to create for tracking events
    const webhooksToCreate = [
      {
        topic: "orders/create",
        address: `${gatewayUrl}/api/webhooks/orders/create`,
        format: "json",
      },
      {
        topic: "orders/paid",
        address: `${gatewayUrl}/api/webhooks/orders/paid`,
        format: "json",
      },
      {
        topic: "checkouts/create",
        address: `${gatewayUrl}/api/webhooks/checkouts/create`,
        format: "json",
      },
      {
        topic: "checkouts/update",
        address: `${gatewayUrl}/api/webhooks/checkouts/update`,
        format: "json",
      },
    ]

    const results = []

    // Check existing webhooks first
    const existingResponse = await fetch(`https://${shop}/admin/api/2023-10/webhooks.json`, {
      headers: {
        "X-Shopify-Access-Token": shopData.accessToken,
      },
    })

    let existingWebhooks = []
    if (existingResponse.ok) {
      const existingData = await existingResponse.json()
      existingWebhooks = existingData.webhooks || []
    }

    // Create webhooks that don't already exist
    for (const webhookConfig of webhooksToCreate) {
      const existingWebhook = existingWebhooks.find(
        (webhook) => webhook.topic === webhookConfig.topic && webhook.address === webhookConfig.address,
      )

      if (existingWebhook) {
        results.push({
          topic: webhookConfig.topic,
          status: "already_exists",
          webhook: existingWebhook,
        })
        continue
      }

      try {
        const response = await fetch(`https://${shop}/admin/api/2023-10/webhooks.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": shopData.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: webhookConfig,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          results.push({
            topic: webhookConfig.topic,
            status: "created",
            webhook: result.webhook,
          })
        } else {
          const errorText = await response.text()
          results.push({
            topic: webhookConfig.topic,
            status: "failed",
            error: errorText,
          })
        }
      } catch (error) {
        results.push({
          topic: webhookConfig.topic,
          status: "error",
          error: error.message,
        })
      }
    }

    const successCount = results.filter((r) => r.status === "created" || r.status === "already_exists").length
    const failureCount = results.filter((r) => r.status === "failed" || r.status === "error").length

    return NextResponse.json({
      success: successCount > 0,
      message: `Setup complete: ${successCount} webhooks configured, ${failureCount} failed`,
      results,
      note: "Webhooks will send order and checkout events to your Facebook Pixel gateway",
    })
  } catch (error) {
    console.error("Error setting up webhooks:", error)
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
