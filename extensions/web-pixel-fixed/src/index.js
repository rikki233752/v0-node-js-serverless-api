// Web Pixel Extension - Fixed Version
// Addressing specific issues from logs

import { register } from "@shopify/web-pixels-extension"

register((api) => {
  // Log available objects to diagnose the environment
  console.log("🔍 [Web Pixel] Available API objects:", {
    analytics: !!api.analytics,
    browser: !!api.browser,
    configuration: !!api.configuration,
    init: !!api.init,
    settings: api.configuration?.settings ? "available" : "unavailable",
  })

  // Extract what we can from the API
  const { analytics, browser } = api

  // Hardcoded values for reliability
  const pixelId = "864857281256627" // Your Facebook Pixel ID
  const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  // Simple function to send events that doesn't rely on browser APIs
  const sendEvent = (eventName, data = {}) => {
    try {
      // Create a basic payload
      const payload = {
        pixelId: pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        custom_data: {
          source: "web-pixel-fixed",
          ...data,
        },
      }

      console.log(`📤 [Web Pixel] Sending ${eventName} event`)

      // Create a unique endpoint URL with the data as a query parameter
      // This avoids using browser APIs directly
      const endpoint = `${gatewayUrl}?d=${encodeURIComponent(JSON.stringify(payload))}&t=${Date.now()}`

      // Use analytics.fetch if available (most reliable in Shopify's environment)
      if (analytics && analytics.fetch) {
        analytics
          .fetch(endpoint, {
            method: "GET",
            mode: "no-cors",
          })
          .catch(() => {
            console.log(`[Web Pixel] Analytics fetch completed for ${eventName}`)
          })
      }
      // Fallback to regular fetch if analytics.fetch is not available
      else if (typeof fetch !== "undefined") {
        fetch(endpoint, {
          method: "GET",
          mode: "no-cors",
        }).catch(() => {
          console.log(`[Web Pixel] Fetch completed for ${eventName}`)
        })
      }
      // Last resort - try to use an image beacon
      else {
        try {
          const img = new Image()
          img.src = endpoint
          console.log(`[Web Pixel] Image beacon sent for ${eventName}`)
        } catch (imgError) {
          console.error(`[Web Pixel] All send methods failed for ${eventName}`)
        }
      }
    } catch (error) {
      console.error(`[Web Pixel] Error sending ${eventName}:`, error)
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
        const { name, data } = event
        console.log(`🔔 [Web Pixel] Received event: ${name}`)

        // Map to Facebook event name or use original
        const fbEventName = eventMapping[name] || name

        // Extract minimal data based on event type
        const customData = { original_event: name }

        // Send the event
        sendEvent(fbEventName, customData)
      } catch (error) {
        console.error(`[Web Pixel] Error processing event:`, error)
      }
    })
  } else {
    console.error("[Web Pixel] Analytics subscription not available")
  }

  console.log("✅ [Web Pixel] Initialization complete")
})
