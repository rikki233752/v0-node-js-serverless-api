// Ultra-Simple Web Pixel Extension v2
// This version uses the absolute minimum code needed to track events

import { register } from "@shopify/web-pixels-extension"

register(({ analytics }) => {
  console.log("🚀 [Simple Pixel v2] Initializing...")

  // Hardcoded values for maximum reliability
  const pixelId = "864857281256627" // Your Facebook Pixel ID
  const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  // Simple event mapping
  const eventMapping = {
    page_viewed: "PageView",
    product_viewed: "ViewContent",
    collection_viewed: "ViewContent",
    search_submitted: "Search",
    product_added_to_cart: "AddToCart",
    cart_viewed: "ViewCart",
    checkout_started: "InitiateCheckout",
    checkout_completed: "Purchase",
  }

  // Simple function to send events
  const sendEvent = (eventName, data = {}) => {
    try {
      // Create a basic event payload
      const payload = {
        pixelId: pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        user_data: {},
        custom_data: {
          source: "simple-pixel-v2",
          ...data,
        },
      }

      console.log(`📤 [Simple Pixel v2] Sending ${eventName} event:`, payload)

      // Use the Image beacon method (most reliable in sandboxed environments)
      const img = new Image()
      img.src = `${gatewayUrl}?d=${encodeURIComponent(JSON.stringify(payload))}&t=${Date.now()}`

      // Also try fetch as backup
      try {
        fetch(gatewayUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "no-cors",
        }).catch((e) => console.log("Fetch backup attempt completed"))
      } catch (fetchError) {
        // Ignore fetch errors - the image beacon is our primary method
      }
    } catch (error) {
      console.error(`❌ [Simple Pixel v2] Error sending ${eventName}:`, error)
    }
  }

  // Subscribe to all events
  analytics.subscribe("all_events", (event) => {
    try {
      const { name, data } = event
      console.log(`🔔 [Simple Pixel v2] Received event: ${name}`)

      // Map to Facebook event name or use original
      const fbEventName = eventMapping[name] || name

      // Extract minimal data based on event type
      const customData = { original_event: name }

      if (name === "product_viewed" && data.productVariant) {
        customData.product_id = data.productVariant.id?.toString()
        customData.product_title = data.productVariant.title
      }

      if (name === "checkout_completed" && data.checkout) {
        customData.order_id = data.checkout.order?.id?.toString()
        customData.value = Number.parseFloat(data.checkout.totalPrice?.amount) || 0
      }

      // Send the event
      sendEvent(fbEventName, customData)
    } catch (error) {
      console.error(`❌ [Simple Pixel v2] Error processing event:`, error)
    }
  })

  // Send initial PageView
  console.log("📄 [Simple Pixel v2] Sending initial PageView")
  sendEvent("PageView", { initial_load: true })

  console.log("✅ [Simple Pixel v2] Initialization complete")
})
