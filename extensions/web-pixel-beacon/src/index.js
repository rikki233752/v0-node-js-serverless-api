// Web Pixel Beacon - Uses browser.sendBeacon if available
import { register } from "@shopify/web-pixels-extension"

register((api) => {
  console.log("🚀 Web Pixel Beacon Extension loaded")

  const { analytics, browser } = api
  const pixelId = "864857281256627" // Your Facebook Pixel ID
  const beaconUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track/beacon"

  // Function to send events via sendBeacon
  const sendEvent = (eventName, eventData = {}) => {
    if (browser && browser.sendBeacon) {
      try {
        const payload = JSON.stringify({
          pixelId: pixelId,
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          custom_data: {
            source: "web-pixel-beacon",
            ...eventData,
          },
        })

        const success = browser.sendBeacon(beaconUrl, payload)
        console.log(`📤 ${eventName} sent via sendBeacon:`, success)
      } catch (error) {
        console.error(`❌ Error sending ${eventName}:`, error)
      }
    } else {
      console.error("❌ browser.sendBeacon not available")
    }
  }

  // Send initial PageView
  sendEvent("PageView", { initial_load: true })

  // Subscribe to events if possible
  if (analytics && analytics.subscribe) {
    const eventMapping = {
      page_viewed: "PageView",
      product_viewed: "ViewContent",
      product_added_to_cart: "AddToCart",
      checkout_started: "InitiateCheckout",
      checkout_completed: "Purchase",
    }

    analytics.subscribe("all_events", (event) => {
      const fbEventName = eventMapping[event.name] || event.name
      sendEvent(fbEventName, {
        shopify_event: event.name,
        event_data: event.data,
      })
    })

    console.log("✅ Subscribed to events")
  }

  console.log("✅ Web Pixel Beacon Extension initialized")
})
