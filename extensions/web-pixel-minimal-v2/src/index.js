import { register } from "@shopify/web-pixels-extension"

register(async ({ configuration, analytics, browser }) => {
  // Initialize with debug mode
  const DEBUG = true

  // Your API endpoint - MUST be a different domain than the Shopify store
  // Using a variable that's unlikely to be blocked by content security policies
  const API_BASE = "https://v0-node-js-serverless-api-lake.vercel.app"
  const TRACKING_PATH = "/api/track/minimal"

  // Log initialization
  if (DEBUG) console.log("🎉 [Web Pixel Gateway] Extension fully initialized!")

  // Function to safely log debug messages
  function debugLog(message, data = {}) {
    if (DEBUG) {
      try {
        console.log(message, data)
      } catch (e) {
        // Ignore logging errors
      }
    }
  }

  // Function to safely get shop domain from event context
  function getShopDomainFromEvent(event) {
    try {
      // Try to get from event context first
      if (event?.context?.document?.location?.hostname) {
        const hostname = event.context.document.location.hostname
        if (hostname && hostname.includes("myshopify.com")) {
          debugLog(`✅ [Web Pixel Gateway] Extracted shop domain from event context: ${hostname}`)
          return hostname
        }
      }

      // Fallback to analytics context if available
      if (analytics?.shopify?.shop?.domain) {
        const domain = analytics.shopify.shop.domain
        if (domain) {
          debugLog(`✅ [Web Pixel Gateway] Using shop domain from analytics context: ${domain}`)
          return domain
        }
      }

      debugLog(`❌ [Web Pixel Gateway] Could not detect shop domain from event`)
      return null
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error detecting shop domain from event: ${error.message}`)
      return null
    }
  }

  // Function to collect minimal user data from various sources
  function collectMinimalUserData(event) {
    const userData = {}

    try {
      // Try to get user agent from event context
      if (event?.context?.navigator?.userAgent) {
        userData.client_user_agent = event.context.navigator.userAgent
        debugLog(`✅ [Web Pixel Gateway] Added user agent from event context to user data`)
      }

      // Generate a simple timestamp-based ID as fallback
      userData.external_id = `shop_visitor_${Date.now()}`
      debugLog(`⚠️ [Web Pixel Gateway] Added fallback external ID to user data`)

      return userData
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error collecting user data: ${error.message}`)
      return {
        external_id: `fallback_${Date.now()}`,
      }
    }
  }

  // Function to safely get page data from event context
  function getMinimalPageData(event) {
    const pageData = {}

    try {
      if (event?.context?.document) {
        const doc = event.context.document

        if (doc.title) {
          pageData.page_title = doc.title
        }

        if (doc.location?.href) {
          pageData.page_location = doc.location.href
          pageData.event_source_url = doc.location.href
        }

        if (doc.location?.hostname) {
          pageData.hostname = doc.location.hostname
        }
      }

      return pageData
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error getting page data: ${error.message}`)
      return {}
    }
  }

  // Function to send event using only analytics.track which is guaranteed to be available
  function sendMinimalEvent(eventName, eventData = {}, event) {
    try {
      const shopDomain = getShopDomainFromEvent(event)

      if (!shopDomain) {
        debugLog(`❌ [Web Pixel Gateway] Cannot send event: Shop domain not detected`)
        return { success: false, error: "Shop domain not detected" }
      }

      debugLog(`📤 [Web Pixel Gateway] Sending ${eventName} event for shop: ${shopDomain}`)

      // Collect minimal user data
      const userData = collectMinimalUserData(event)
      debugLog(`👤 [Web Pixel Gateway] Collected user data:`, userData)

      // Get minimal page data
      const pageData = getMinimalPageData(event)
      debugLog(`📄 [Web Pixel Gateway] Collected page data:`, pageData)

      // Prepare the minimal payload
      const minimalPayload = {
        event: eventName,
        shop: shopDomain,
        timestamp: Date.now(),
        user: userData.external_id,
        url: pageData.page_location || "unknown",
        title: pageData.page_title || "unknown",
      }

      // Use analytics.track which is guaranteed to be available in the sandbox
      // This sends the event to Shopify's analytics system, which we can later
      // retrieve via webhooks or the Shopify API
      analytics.track(eventName, {
        ...minimalPayload,
        // Add a special property to identify our events
        __gateway_pixel: true,
        __gateway_shop: shopDomain,
      })

      debugLog(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event using analytics.track`)
      return { success: true }
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error sending ${eventName} event: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  // Subscribe to page view events
  analytics.subscribe("page_viewed", async (event) => {
    try {
      // Extract shop domain from the page_viewed event
      const shopDomain = getShopDomainFromEvent(event)
      debugLog(`✅ [Web Pixel Gateway] Extracted shop domain from page_viewed event: ${shopDomain}`)

      // Send PageView event
      sendMinimalEvent(
        "PageView",
        {
          content_name: event.context?.document?.title || "Page View",
          content_category: "page_view",
        },
        event,
      )
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing page_viewed event: ${error.message}`)
    }
  })

  // Subscribe to product viewed events
  analytics.subscribe("product_viewed", async (event) => {
    try {
      sendMinimalEvent("ViewContent", {}, event)
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing product_viewed event: ${error.message}`)
    }
  })

  // Subscribe to collection viewed events
  analytics.subscribe("collection_viewed", async (event) => {
    try {
      sendMinimalEvent("ViewCollection", {}, event)
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing collection_viewed event: ${error.message}`)
    }
  })

  // Subscribe to search submitted events
  analytics.subscribe("search_submitted", async (event) => {
    try {
      sendMinimalEvent("Search", {}, event)
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing search_submitted event: ${error.message}`)
    }
  })

  // Subscribe to cart events
  analytics.subscribe("cart_viewed", async (event) => {
    try {
      sendMinimalEvent("ViewCart", {}, event)
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing cart_viewed event: ${error.message}`)
    }
  })

  // Subscribe to checkout events
  analytics.subscribe("checkout_started", async (event) => {
    try {
      sendMinimalEvent("InitiateCheckout", {}, event)
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing checkout_started event: ${error.message}`)
    }
  })

  // Subscribe to purchase events
  analytics.subscribe("checkout_completed", async (event) => {
    try {
      sendMinimalEvent("Purchase", {}, event)
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing checkout_completed event: ${error.message}`)
    }
  })
})
