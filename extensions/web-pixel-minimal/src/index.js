// Minimal Web Pixel Extension
// Ultra-simplified version to avoid build issues

import { register } from "@shopify/web-pixels-extension"

register(({ analytics }) => {
  // Simple console log to confirm the extension is loaded
  console.log("🚀 Minimal Web Pixel Extension loaded")

  // Hardcoded values
  const pixelId = "864857281256627"
  const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  // Simple function to send events
  const sendEvent = (eventName, data = {}) => {
    try {
      // Create a basic payload
      const payload = {
        pixelId: pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        custom_data: data,
      }

      console.log(`📤 Sending ${eventName} event`)

      // Use image beacon method (most reliable)
      const img = new Image()
      img.src = `${gatewayUrl}?d=${encodeURIComponent(JSON.stringify(payload))}&t=${Date.now()}`
    } catch (error) {
      console.error(`Error sending ${eventName}:`, error)
    }
  }

  // Send initial PageView
  sendEvent("PageView", { initial_load: true })

  // Subscribe to page_viewed events
  analytics.subscribe("page_viewed", (event) => {
    console.log("Page viewed event received")
    sendEvent("PageView")
  })

  // Subscribe to product_added_to_cart events
  analytics.subscribe("product_added_to_cart", (event) => {
    console.log("Add to cart event received")
    sendEvent("AddToCart")
  })

  console.log("✅ Minimal Web Pixel Extension initialized")
})
