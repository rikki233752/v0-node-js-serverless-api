// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  // Debug mode flag
  const debug = configuration.debug || false

  // Log function that only logs in debug mode
  const log = (...args) => {
    if (debug) {
      console.log("🎯 [Web Pixel Gateway]", ...args)
    }
  }

  // Error logging function
  const logError = (...args) => {
    console.error("❌ [Web Pixel Gateway]", ...args)
  }

  // Get the pixel ID from configuration
  let pixelId = configuration.accountID || configuration.pixelId

  // Get the gateway URL from configuration
  const gatewayUrl = configuration.gatewayUrl || process.env.HOST + "/api/track"

  log("Initializing with configuration:", configuration)
  log("Pixel ID:", pixelId)
  log("Gateway URL:", gatewayUrl)

  // Send debug data to our debug endpoint
  try {
    fetch("/api/debug/web-pixel-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        configAccountId: pixelId,
        configData: configuration,
        analyticsData: {
          meta: analytics.meta,
          context: analytics.context,
        },
        detectedPixels: window.fbq ? ["Facebook Pixel detected"] : [],
      }),
    }).catch((e) => log("Debug data send error (non-critical):", e))
  } catch (e) {
    log("Failed to send debug data (non-critical):", e)
  }

  // Function to get the current shop domain
  function getShopDomain() {
    return window.location.hostname
  }

  // Function to send events to our gateway
  async function sendToGateway(eventName, eventData) {
    try {
      if (!pixelId) {
        log("No pixel ID configured, fetching from API")

        // Try to get pixel ID from API
        try {
          const configResponse = await fetch("/api/track/config?shop=" + getShopDomain())
          if (configResponse.ok) {
            const config = await configResponse.json()
            if (config.success && config.pixelId) {
              log("Got pixel ID from API:", config.pixelId)
              pixelId = config.pixelId
            } else {
              logError("API returned no pixel ID:", config)
            }
          } else {
            logError("Failed to fetch pixel config:", await configResponse.text())
          }
        } catch (e) {
          logError("Error fetching pixel config:", e)
        }

        // If still no pixel ID, use fallback
        if (!pixelId) {
          logError("No pixel ID available, using fallback")
          pixelId = "584928510540140" // Fallback to test pixel
        }
      }

      // Prepare the payload
      const payload = {
        pixelId,
        eventName,
        eventData,
        shopDomain: getShopDomain(),
        pageUrl: window.location.href,
        timestamp: new Date().toISOString(),
        source: "web-pixel",
      }

      log(`Sending ${eventName} event to gateway:`, payload)

      // Send the event to our gateway
      const response = await fetch(gatewayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true, // Ensure the request completes even if the page unloads
      })

      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}: ${await response.text()}`)
      }

      log(`Event ${eventName} sent successfully`)
      return true
    } catch (error) {
      logError(`Failed to send ${eventName} event:`, error)
      return false
    }
  }

  // Subscribe to all events
  analytics.subscribe("all_events", async (event) => {
    const { name, data } = event
    log(`Received ${name} event:`, data)

    // Map Shopify event to Facebook event
    let fbEventName
    switch (name) {
      case "page_viewed":
        fbEventName = "PageView"
        break
      case "product_viewed":
        fbEventName = "ViewContent"
        break
      case "product_added_to_cart":
        fbEventName = "AddToCart"
        break
      case "checkout_started":
        fbEventName = "InitiateCheckout"
        break
      case "checkout_completed":
        fbEventName = "Purchase"
        break
      default:
        fbEventName = name // Use original name for custom events
    }

    // Send the event to our gateway
    await sendToGateway(fbEventName, data)
  })

  // Return public API
  const WebPixelGateway = {
    // Public methods that can be called from outside
    trackCustomEvent: (eventName, eventData) => {
      log(`Tracking custom event ${eventName}:`, eventData)
      return sendToGateway(eventName, eventData)
    },
  }

  return WebPixelGateway
})
