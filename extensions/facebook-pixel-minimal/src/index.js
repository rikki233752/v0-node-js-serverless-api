// Minimal Facebook Pixel Extension - No detection, no browser APIs
import { register } from "@shopify/web-pixels-extension"

register(({ analytics }) => {
  // Simple console log for initialization
  console.log("🚀 [FB Pixel] Minimal extension starting...")

  // Hardcoded values
  const PIXEL_ID = "584928510540140" // Default test pixel ID
  const API_URL = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  console.log(`🎯 [FB Pixel] Using pixel ID: ${PIXEL_ID}`)
  console.log(`🔗 [FB Pixel] Using API URL: ${API_URL}`)

  // Simple event mapping
  const eventMap = {
    page_viewed: "PageView",
    product_viewed: "ViewContent",
    collection_viewed: "ViewContent",
    search_submitted: "Search",
    product_added_to_cart: "AddToCart",
    cart_viewed: "ViewCart",
    checkout_started: "InitiateCheckout",
    checkout_completed: "Purchase",
  }

  // Simple event sender
  const sendEvent = (name, data = {}) => {
    try {
      console.log(`📤 [FB Pixel] Sending event: ${name}`)

      const payload = {
        pixelId: PIXEL_ID,
        event_name: name,
        event_time: Math.floor(Date.now() / 1000),
        custom_data: data,
      }

      // Use no-cors to avoid CORS issues
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "no-cors",
        keepalive: true,
      })
    } catch (err) {
      console.error(`❌ [FB Pixel] Error sending event: ${err.message}`)
    }
  }

  // Subscribe to Shopify events
  analytics.subscribe("all_events", (event) => {
    try {
      const { name, data } = event
      console.log(`🔔 [FB Pixel] Received event: ${name}`)

      // Map to Facebook event name
      const fbEvent = eventMap[name] || name

      // Send the event
      sendEvent(fbEvent, {
        source: "shopify",
        shopify_event: name,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      console.error(`❌ [FB Pixel] Error processing event: ${err.message}`)
    }
  })

  // Send initial PageView
  sendEvent("PageView", { initial: true })

  console.log("✅ [FB Pixel] Minimal extension initialized")
})
