// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  console.log("🎯 [Web Pixel Gateway] Starting initialization...")

  // Configuration
  const GATEWAY_URL = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
  const CONFIG_URL = "https://v0-node-js-serverless-api-lake.vercel.app/api/track/config"
  const FALLBACK_PIXEL_ID = "864857281256627" // Fallback if config API fails

  // Detect shop domain
  const detectShopDomain = () => {
    try {
      // Method 1: browser.url.href
      if (browser?.url?.href) {
        const url = new URL(browser.url.href)
        console.log("🔍 [Web Pixel Gateway] Domain from browser.url.href:", url.hostname)
        return url.hostname
      }

      // Method 2: browser.document.location.href
      if (browser?.document?.location?.href) {
        const url = new URL(browser.document.location.href)
        console.log("🔍 [Web Pixel Gateway] Domain from browser.document.location:", url.hostname)
        return url.hostname
      }

      // Method 3: Fallback to window.location.hostname
      if (typeof window !== "undefined" && window.location?.hostname) {
        console.log("🔍 [Web Pixel Gateway] Domain from window.location:", window.location.hostname)
        return window.location.hostname
      }

      console.log("⚠️ [Web Pixel Gateway] Could not detect shop domain")
      return null
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error detecting shop domain:", error)
      return null
    }
  }

  // Get pixel ID from config API
  const getPixelIdFromConfig = async (shopDomain) => {
    if (!shopDomain) return null

    try {
      console.log(`📡 [Web Pixel Gateway] Fetching config for shop: ${shopDomain}`)

      const response = await fetch(`${CONFIG_URL}?shop=${encodeURIComponent(shopDomain)}`)

      if (!response.ok) {
        console.error(`❌ [Web Pixel Gateway] Config API returned ${response.status}`)
        return null
      }

      const data = await response.json()

      if (data.success && data.pixelId) {
        console.log(`✅ [Web Pixel Gateway] Got pixel ID from config: ${data.pixelId}`)
        return data.pixelId
      }

      console.log(`⚠️ [Web Pixel Gateway] No pixel ID in config response`)
      return null
    } catch (error) {
      console.error(`💥 [Web Pixel Gateway] Error fetching config:`, error)
      return null
    }
  }

  // Get cookies
  const getCookies = () => {
    const cookies = { fbp: null, fbc: null }
    try {
      if (browser?.cookie) {
        const cookieData = browser.cookie.get()
        const cookieString = typeof cookieData === "string" ? cookieData : cookieData?.value || ""

        const fbpMatch = cookieString.match(/_fbp=([^;]+)/)
        if (fbpMatch) cookies.fbp = fbpMatch[1]

        const fbcMatch = cookieString.match(/_fbc=([^;]+)/)
        if (fbcMatch) cookies.fbc = fbcMatch[1]
      }
    } catch (e) {
      console.log("🍪 [Web Pixel Gateway] Cookie reading error:", e.message)
    }
    return cookies
  }

  // Send event to gateway
  const sendToGateway = (pixelId, eventName, customData = {}, shopifyEventData = {}) => {
    try {
      const cookies = getCookies()

      const userData = {
        client_user_agent: browser?.navigator?.userAgent || "Unknown",
        fbp: cookies.fbp,
        fbc: cookies.fbc,
      }

      // Add customer data if available
      if (shopifyEventData.customer) {
        if (shopifyEventData.customer.email) userData.em = shopifyEventData.customer.email
        if (shopifyEventData.customer.phone) userData.ph = shopifyEventData.customer.phone
      }

      const eventData = {
        pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: browser?.url?.href || "https://unknown.com",
        user_data: userData,
        custom_data: {
          ...customData,
          shopify_source: true,
        },
      }

      console.log(`📤 [Web Pixel Gateway] Sending ${eventName} event to Pixel ${pixelId}`)

      fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
        mode: "no-cors",
      })
        .then(() => console.log(`✅ [Web Pixel Gateway] Sent ${eventName} event`))
        .catch((error) => console.error(`❌ [Web Pixel Gateway] Failed to send ${eventName}:`, error))
    } catch (error) {
      console.error(`💥 [Web Pixel Gateway] Error sending ${eventName}:`, error)
    }
  }

  // Event mapping
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
    product_removed_from_cart: "RemoveFromCart",
  }

  // Initialize
  const initialize = async () => {
    console.log("🚀 [Web Pixel Gateway] Initializing...")

    // Detect shop domain
    const shopDomain = detectShopDomain()

    // Get pixel ID from config or use fallback
    let pixelId = await getPixelIdFromConfig(shopDomain)

    if (!pixelId) {
      pixelId = FALLBACK_PIXEL_ID
      console.log(`⚠️ [Web Pixel Gateway] Using fallback pixel ID: ${pixelId}`)
    }

    // Subscribe to events
    analytics.subscribe("all_events", (event) => {
      try {
        const { name, data } = event
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
                content_ids: [product.id?.toString() || product.sku],
                content_name: product.title || product.product?.title,
                content_category: product.product?.type || product.product?.vendor,
                value: Number.parseFloat(product.price?.amount) || 0,
                currency: product.price?.currencyCode || "USD",
              }
            }
            break

          case "product_added_to_cart":
            if (data.cartLine) {
              const cartLine = data.cartLine
              const merchandise = cartLine.merchandise
              customData = {
                content_type: "product",
                content_ids: [merchandise?.id?.toString() || merchandise?.sku],
                content_name: merchandise?.title || merchandise?.product?.title,
                value: Number.parseFloat(cartLine.cost?.totalAmount?.amount) || 0,
                currency: cartLine.cost?.totalAmount?.currencyCode || "USD",
                num_items: cartLine.quantity || 1,
              }
            }
            break

          case "checkout_started":
          case "checkout_completed":
            if (data.checkout) {
              customData = {
                value: Number.parseFloat(data.checkout.totalPrice?.amount) || 0,
                currency: data.checkout.currencyCode || "USD",
                content_ids: data.checkout.lineItems?.map((item) => item.variant?.product?.id) || [],
                num_items: data.checkout.lineItems?.length || 0,
              }
            }
            break
        }

        sendToGateway(pixelId, fbEventName, customData, data)
      } catch (error) {
        console.error(`💥 [Web Pixel Gateway] Error processing ${event.name}:`, error)
      }
    })

    // Send initial PageView
    sendToGateway(pixelId, "PageView", {
      page_title: "Initial Load",
      page_location: browser?.url?.href || "Unknown",
      initial_load: true,
    })

    console.log(`🎉 [Web Pixel Gateway] Initialized with pixel ID: ${pixelId}`)
  }

  // Start initialization
  initialize()
})
