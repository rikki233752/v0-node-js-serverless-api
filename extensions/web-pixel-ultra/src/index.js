// Web Pixel Ultra - Designed for highly restricted environments
// Avoids using Image constructor and other restricted APIs

import { register } from "@shopify/web-pixels-extension"

register((api) => {
  console.log("🚀 Ultra Web Pixel Extension loaded")

  // Extract what we can from the API
  const { analytics, browser } = api

  // Hardcoded values for reliability
  const pixelId = "864857281256627" // Your Facebook Pixel ID
  const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  // Simple function to send events using only analytics.fetch
  const sendEvent = (eventName, data = {}) => {
    try {
      // Create a basic payload
      const payload = {
        pixelId: pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        custom_data: {
          source: "web-pixel-ultra",
          ...data,
        },
      }

      console.log(`📤 Sending ${eventName} event`)

      // Create a unique endpoint URL with the data as a query parameter
      const endpoint = `${gatewayUrl}?d=${encodeURIComponent(JSON.stringify(payload))}&t=${Date.now()}`

      // ONLY use analytics.fetch - avoid all other methods
      if (analytics && analytics.fetch) {
        analytics
          .fetch(endpoint, {
            method: "GET",
            mode: "no-cors",
          })
          .then(() => {
            console.log(`✅ Event ${eventName} sent successfully`)
          })
          .catch((error) => {
            console.log(`❌ Error sending ${eventName} via analytics.fetch:`, error)
          })
      } else {
        console.error("❌ analytics.fetch not available")
      }
    } catch (error) {
      console.error(`❌ Error preparing ${eventName} event:`, error)
    }
  }

  // Send initial PageView
  sendEvent("PageView", { initial_load: true })

  // Subscribe to events if analytics is available
  if (analytics && analytics.subscribe) {
    // Map of Shopify events to Facebook events
    const eventMapping = {
      page_viewed: "PageView",
      product_viewed: "ViewContent",
      product_added_to_cart: "AddToCart",
      checkout_started: "InitiateCheckout",
      checkout_completed: "Purchase",
    }

    // Subscribe to all events
    analytics.subscribe("all_events", (event) => {
      try {
        const { name } = event
        console.log(`📣 ${name} event received`)

        // Map to Facebook event name or use original
        const fbEventName = eventMapping[name] || name

        // Send the event
        sendEvent(fbEventName, { shopify_event: name })
      } catch (error) {
        console.error(`❌ Error processing event:`, error)
      }
    })
  } else {
    console.error("❌ analytics.subscribe not available")
  }

  console.log("✅ Ultra Web Pixel Extension initialized")
})
