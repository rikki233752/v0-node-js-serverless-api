// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  // Debug logging for initialization
  console.log("🎯 [Web Pixel Gateway] Starting initialization...")

  // Log available objects and their types for debugging
  console.log("🔍 [Web Pixel Gateway] Available objects:", {
    configuration: !!configuration,
    analytics: !!analytics,
    browser: !!browser,
    browserKeys: browser ? Object.keys(browser) : [],
  })

  // Define the gateway URL
  const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
  const configUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track/config"

  // Safely get the current URL
  const getCurrentUrl = () => {
    try {
      if (browser && browser.url && browser.url.href) {
        return browser.url.href
      }
      return "unknown"
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error getting URL:", error)
      return "unknown"
    }
  }

  // Safely get the shop domain
  const getShopDomain = () => {
    try {
      const url = getCurrentUrl()
      if (url !== "unknown") {
        const urlObj = new URL(url)
        return urlObj.hostname
      }
      return "unknown"
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error getting shop domain:", error)
      return "unknown"
    }
  }

  // Safely get cookies
  const getCookies = () => {
    const cookies = { fbp: null, fbc: null }
    try {
      if (browser && browser.cookie) {
        const cookieData = browser.cookie.get()
        if (typeof cookieData === "string") {
          const fbpMatch = cookieData.match(/_fbp=([^;]+)/)
          if (fbpMatch) cookies.fbp = fbpMatch[1]

          const fbcMatch = cookieData.match(/_fbc=([^;]+)/)
          if (fbcMatch) cookies.fbc = fbcMatch[1]
        }
      }
    } catch (e) {
      console.log("🍪 [Web Pixel Gateway] Cookie reading not available:", e.message)
    }
    return cookies
  }

  // Get client info safely
  const getClientInfo = () => {
    try {
      const url = getCurrentUrl()
      return {
        url: url,
        timestamp: new Date().toISOString(),
      }
    } catch (e) {
      console.error("💥 [Web Pixel Gateway] Error getting client info:", e)
      return {
        url: "unknown",
        timestamp: new Date().toISOString(),
      }
    }
  }

  // Initialize tracking
  const initializeTracking = async () => {
    // Log configuration for debugging
    console.log("🔧 [Web Pixel Gateway] Configuration object:", configuration)
    console.log("🔧 [Web Pixel Gateway] Analytics object:", analytics)
    console.log("🌐 [Web Pixel Gateway] Current URL:", getCurrentUrl())

    // Get shop domain
    const shopDomain = getShopDomain()

    // Try to get pixel ID from various sources
    let pixelId = null

    // 1. Try to get from configuration
    if (configuration && configuration.accountID) {
      pixelId = configuration.accountID
      console.log("✅ [Web Pixel Gateway] Using pixel ID from configuration:", pixelId)
    }

    // 2. If no pixel ID yet, try to get from API
    if (!pixelId && shopDomain !== "unknown") {
      try {
        console.log("🔍 [Web Pixel Gateway] Fetching pixel ID from API...")

        // Use simple fetch with no-cors mode to avoid CORS issues
        const response = await fetch(`${configUrl}?shop=${shopDomain}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "cors",
        })

        console.log("📡 [Web Pixel Gateway] API Response status:", response.status)

        if (response.ok) {
          const config = await response.json()
          console.log("🔍 [Web Pixel Gateway] API Response:", config)

          if (config.success && config.pixelId) {
            pixelId = config.pixelId
            console.log("✅ [Web Pixel Gateway] Got pixel ID from API:", pixelId)
          }
        }
      } catch (error) {
        console.error("💥 [Web Pixel Gateway] Error fetching pixel config:", error)
      }
    }

    // 3. If still no pixel ID, use environment variable if available
    if (!pixelId) {
      // Use environment variable if available (will be replaced at build time)
      const envPixelId = process.env.NEXT_PUBLIC_TEST_PIXEL_ID
      if (envPixelId) {
        pixelId = envPixelId
        console.log("⚠️ [Web Pixel Gateway] Using environment variable pixel ID:", pixelId)
      }
    }

    // If we still don't have a pixel ID, we can't proceed
    if (!pixelId) {
      console.error("❌ [Web Pixel Gateway] No pixel ID available, cannot initialize tracking")
      return
    }

    // Helper function to send event to Meta Conversions API Gateway
    const sendToGateway = (eventName, customData = {}, shopifyEventData = {}) => {
      try {
        const cookies = getCookies()
        const clientInfo = getClientInfo()

        const eventData = {
          pixelId: pixelId,
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: clientInfo.url,
          shop_domain: shopDomain,
          user_data: {
            client_user_agent: browser?.navigator?.userAgent || "Unknown",
            fbp: cookies.fbp,
            fbc: cookies.fbc,
          },
          custom_data: {
            ...customData,
            shopify_source: true,
            client_info: clientInfo,
          },
        }

        console.log(`📤 [Web Pixel Gateway] Sending ${eventName} event to ${gatewayUrl}`)

        // Use no-cors mode to avoid CORS issues
        fetch(gatewayUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
          keepalive: true,
          mode: "no-cors",
        }).catch((error) => {
          console.error(`❌ [Web Pixel Gateway] Failed to send ${eventName}:`, error)
        })
      } catch (error) {
        console.error(`💥 [Web Pixel Gateway] Error sending ${eventName} event:`, error)
      }
    }

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

    // Subscribe to all Shopify Customer Events
    analytics.subscribe("all_events", (event) => {
      try {
        const { name, data } = event
        console.log(`🔔 [Web Pixel Gateway] Received Shopify event: ${name}`)

        const fbEventName = eventMapping[name] || name
        let customData = {}

        // Process event-specific data
        switch (name) {
          case "page_viewed":
            customData = {
              page_title: data.context?.document?.title || "Unknown",
              page_location: data.context?.window?.location?.href || "Unknown",
              page_path: data.context?.window?.location?.pathname || "/",
            }
            break

          case "product_viewed":
            if (data.productVariant) {
              const product = data.productVariant
              customData = {
                content_type: "product",
                content_ids: [product.id?.toString() || "unknown"],
                content_name: product.title || product.product?.title || "Unknown Product",
                value: Number.parseFloat(product.price?.amount) || 0,
                currency: product.price?.currencyCode || "USD",
              }
            }
            break

          case "checkout_completed":
            if (data.checkout) {
              const checkout = data.checkout
              customData = {
                content_type: "product",
                value: Number.parseFloat(checkout.totalPrice?.amount) || 0,
                currency: checkout.totalPrice?.currencyCode || "USD",
                order_id: checkout.order?.id || checkout.id,
              }
            }
            break
        }

        sendToGateway(fbEventName, customData, data)
      } catch (error) {
        console.error(`💥 [Web Pixel Gateway] Error processing event ${event.name}:`, error)
      }
    })

    // Send initial PageView event
    console.log("📄 [Web Pixel Gateway] Sending initial PageView event...")
    sendToGateway("PageView", {
      page_title: "Initial Load",
      initial_load: true,
    })

    console.log(`🎉 [Web Pixel Gateway] Extension fully initialized with pixel ID: ${pixelId}`)
  }

  // Start initialization
  initializeTracking()
})
