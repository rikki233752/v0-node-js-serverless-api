// Ultra-simplified Web Pixel Extension for sandboxed environments
import { register } from "@shopify/web-pixels-extension"

register(({ analytics }) => {
  console.log("🚀 [Web Pixel] Starting with ultra-simplified approach...")

  // Hardcoded values - will be replaced with environment variables at build time
  const PIXEL_ID = "584928510540140" // Default test pixel ID
  const GATEWAY_URL = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  console.log(`🎯 [Web Pixel] Using pixel ID: ${PIXEL_ID}`)
  console.log(`🔗 [Web Pixel] Using gateway URL: ${GATEWAY_URL}`)

  // Map Shopify event names to Facebook standard events
  const eventMapping = {
    page_viewed: "PageView",
    product_viewed: "ViewContent",
    collection_viewed: "ViewContent",
    search_submitted: "Search",
    product_added_to_cart: "AddToCart",
    cart_viewed: "ViewCart",
    checkout_started: "InitiateCheckout",
    checkout_completed: "Purchase",
    payment_info_submitted: "AddPaymentInfo",
    checkout_address_info_submitted: "AddShippingInfo",
    checkout_shipping_info_submitted: "AddShippingInfo",
  }

  // Helper function to send event to our API
  const sendEvent = (eventName, customData = {}, shopifyData = {}) => {
    try {
      const eventData = {
        pixelId: PIXEL_ID,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        user_data: {},
        custom_data: {
          ...customData,
          shopify_source: true,
          shopify_data: shopifyData,
        },
      }

      console.log(`📤 [Web Pixel] Sending ${eventName} event`)

      // Use no-cors mode to avoid CORS issues
      fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
        mode: "no-cors",
        keepalive: true,
      }).catch((error) => {
        console.error(`❌ [Web Pixel] Error sending ${eventName}:`, error.message)
      })
    } catch (error) {
      console.error(`💥 [Web Pixel] Error preparing ${eventName} event:`, error.message)
    }
  }

  // Subscribe to all Shopify events
  analytics.subscribe("all_events", (event) => {
    try {
      const { name, data } = event
      console.log(`🔔 [Web Pixel] Received Shopify event: ${name}`)

      // Map to Facebook event name or use original
      const fbEventName = eventMapping[name] || name

      // Extract basic data for the event
      const customData = { event_source: "shopify" }

      // Send the event
      sendEvent(fbEventName, customData, data)
    } catch (error) {
      console.error(`💥 [Web Pixel] Error processing event:`, error.message)
    }
  })

  // Send initial PageView
  console.log("📄 [Web Pixel] Sending initial PageView event")
  sendEvent("PageView", { initial_load: true })

  console.log("✅ [Web Pixel] Initialization complete")
})
