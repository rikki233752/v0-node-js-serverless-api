// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  console.log("🎯 [Web Pixel Gateway] Starting initialization...")

  // Since Shopify configuration is unreliable, fetch settings from our API
  const initializeWithApiSettings = async () => {
    try {
      // Get shop domain from current URL
      let shopDomain = "unknown"
      if (browser && browser.url && browser.url.hostname) {
        shopDomain = browser.url.hostname
      } else if (typeof window !== "undefined" && window.location) {
        shopDomain = window.location.hostname
      }

      console.log("🏪 [Web Pixel Gateway] Detected shop domain:", shopDomain)

      // Fetch settings from our API
      const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
      const configUrl = `${gatewayUrl}/config`

      console.log("📡 [Web Pixel Gateway] Fetching settings from API...")

      const response = await fetch(configUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: shopDomain,
          source: "web-pixel-runtime",
        }),
        mode: "cors",
      })

      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status}`)
      }

      const apiConfig = await response.json()
      console.log("✅ [Web Pixel Gateway] API config received:", apiConfig)

      if (!apiConfig.success || !apiConfig.pixelId) {
        console.log("⚠️ [Web Pixel Gateway] No pixel configuration found for shop:", shopDomain)
        console.log("💡 [Web Pixel Gateway] Using fallback configuration")

        // Use fallback - try to detect Facebook Pixel on page
        const detectedPixelId = detectFacebookPixel()
        if (detectedPixelId) {
          console.log("🔍 [Web Pixel Gateway] Detected Facebook Pixel on page:", detectedPixelId)
          return initializeTracking(detectedPixelId, gatewayUrl, true)
        } else {
          console.log("❌ [Web Pixel Gateway] No Facebook Pixel detected, cannot initialize")
          return
        }
      }

      // Use API configuration
      const { pixelId, gatewayEnabled } = apiConfig

      if (!gatewayEnabled) {
        console.log("⚠️ [Web Pixel Gateway] Gateway disabled for pixel:", pixelId)
        return
      }

      console.log("🎯 [Web Pixel Gateway] Initializing with API config - Pixel ID:", pixelId)
      return initializeTracking(pixelId, gatewayUrl, true)
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Failed to fetch API config:", error)

      // Fallback: try to detect Facebook Pixel on page
      console.log("🔄 [Web Pixel Gateway] Falling back to pixel detection...")
      const detectedPixelId = detectFacebookPixel()
      if (detectedPixelId) {
        console.log("🔍 [Web Pixel Gateway] Detected Facebook Pixel:", detectedPixelId)
        const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
        return initializeTracking(detectedPixelId, gatewayUrl, true)
      } else {
        console.log("❌ [Web Pixel Gateway] No fallback available, cannot initialize")
      }
    }
  }

  // Function to detect existing Facebook Pixel on the page
  const detectFacebookPixel = () => {
    try {
      // Method 1: Check for fbq global function
      if (typeof window !== "undefined" && window.fbq && window.fbq._pixelId) {
        return window.fbq._pixelId
      }

      // Method 2: Check fbq queue for init calls
      if (typeof window !== "undefined" && window.fbq && window.fbq.queue) {
        for (const call of window.fbq.queue) {
          if (call[0] === "init" && call[1]) {
            return call[1]
          }
        }
      }

      // Method 3: Check for Facebook Pixel script tags
      if (typeof document !== "undefined") {
        const scripts = document.querySelectorAll("script")
        for (const script of scripts) {
          const content = script.textContent || script.innerHTML
          const initMatch = content.match(/fbq\s*\(\s*['"]init['"],\s*['"](\d+)['"]/)
          if (initMatch && initMatch[1]) {
            return initMatch[1]
          }
        }
      }

      return null
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error detecting Facebook Pixel:", error)
      return null
    }
  }

  // Initialize tracking with the given pixel ID
  const initializeTracking = (pixelId, gatewayUrl, debug) => {
    console.log("🚀 [Web Pixel Gateway] Initializing tracking with Pixel ID:", pixelId)

    // Helper function to safely get cookies
    const getCookies = () => {
      const cookies = { fbp: null, fbc: null }
      try {
        if (browser && browser.cookie) {
          const cookieData = browser.cookie.get()
          let cookieString = ""

          if (typeof cookieData === "string") {
            cookieString = cookieData
          } else if (cookieData && typeof cookieData === "object") {
            cookieString = cookieData.value || cookieData.cookie || ""
          }

          if (cookieString && typeof cookieString === "string") {
            const fbpMatch = cookieString.match(/_fbp=([^;]+)/)
            if (fbpMatch) cookies.fbp = fbpMatch[1]

            const fbcMatch = cookieString.match(/_fbc=([^;]+)/)
            if (fbcMatch) cookies.fbc = fbcMatch[1]
          }
        }
      } catch (e) {
        console.log("🍪 [Web Pixel Gateway] Cookie reading not available:", e.message)
      }
      return cookies
    }

    // Helper function to get client information
    const getClientInfo = () => {
      try {
        let url = "https://unknown.com"
        let referrer = ""

        if (browser) {
          if (browser.url && browser.url.href) url = browser.url.href
          if (browser.document && browser.document.referrer) referrer = browser.document.referrer
        }

        return {
          user_agent: browser?.navigator?.userAgent || "Unknown",
          language: browser?.navigator?.language || "en",
          url: url,
          referrer: referrer,
          timestamp: new Date().toISOString(),
        }
      } catch (e) {
        console.error("💥 [Web Pixel Gateway] Error getting client info:", e)
        return {
          user_agent: "Unknown",
          language: "en",
          url: "https://unknown.com",
          referrer: "",
          timestamp: new Date().toISOString(),
        }
      }
    }

    // Helper function to send event to Meta Conversions API Gateway
    const sendToGateway = (eventName, customData = {}, shopifyEventData = {}) => {
      try {
        const cookies = getCookies()
        const clientInfo = getClientInfo()

        const userData = {
          client_user_agent: clientInfo.user_agent,
          fbp: cookies.fbp,
          fbc: cookies.fbc,
        }

        if (shopifyEventData.customer) {
          if (shopifyEventData.customer.email) userData.em = shopifyEventData.customer.email
          if (shopifyEventData.customer.phone) userData.ph = shopifyEventData.customer.phone
        }

        const eventData = {
          pixelId: pixelId,
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: clientInfo.url,
          user_data: userData,
          custom_data: {
            ...customData,
            shopify_source: true,
            client_info: clientInfo,
            ...(debug && { shopify_event_data: shopifyEventData }),
          },
        }

        console.log(`📤 [Web Pixel Gateway] Sending ${eventName} event to Pixel ${pixelId}:`, eventData)

        if (typeof fetch !== "undefined") {
          fetch(gatewayUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
            mode: "no-cors",
          })
            .then(() => {
              console.log(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event to Pixel ${pixelId}`)
            })
            .catch((error) => {
              console.error(`❌ [Web Pixel Gateway] Failed to send ${eventName}:`, error)
            })
        }
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
      product_removed_from_cart: "RemoveFromCart",
    }

    console.log("🎯 [Web Pixel Gateway] Setting up event listeners...")

    // Subscribe to all Shopify Customer Events
    analytics.subscribe("all_events", (event) => {
      try {
        const { name, data } = event
        console.log(`🔔 [Web Pixel Gateway] Received Shopify event: ${name}`, { name, data })

        const fbEventName = eventMapping[name] || name
        let customData = {}

        // Process event-specific data (same as before)
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
                content_ids: [product.id?.toString() || product.sku || product.product?.id?.toString()],
                content_name: product.title || product.product?.title || "Unknown Product",
                content_category: product.product?.type || product.product?.vendor || "",
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
                content_ids: [merchandise?.id?.toString() || merchandise?.sku || "unknown"],
                content_name: merchandise?.title || merchandise?.product?.title || "Unknown Product",
                value: Number.parseFloat(cartLine.cost?.totalAmount?.amount) || 0,
                currency: cartLine.cost?.totalAmount?.currencyCode || "USD",
                num_items: cartLine.quantity || 1,
              }
            }
            break

          case "cart_viewed":
            if (data.cart) {
              const cart = data.cart
              const contentIds =
                cart.lines?.map((line) => line.merchandise?.id?.toString() || line.merchandise?.sku || "unknown") || []

              customData = {
                content_type: "product",
                content_ids: contentIds,
                value: Number.parseFloat(cart.cost?.totalAmount?.amount) || 0,
                currency: cart.cost?.totalAmount?.currencyCode || "USD",
                num_items: cart.totalQuantity || 0,
              }
            }
            break

          case "checkout_started":
            if (data.checkout) {
              const checkout = data.checkout
              const contentIds =
                checkout.lineItems?.map(
                  (item) => item.variant?.id?.toString() || item.variant?.sku || item.id?.toString() || "unknown",
                ) || []

              customData = {
                content_type: "product",
                content_ids: contentIds,
                value:
                  Number.parseFloat(checkout.totalPrice?.amount) ||
                  Number.parseFloat(checkout.subtotalPrice?.amount) ||
                  0,
                currency: checkout.totalPrice?.currencyCode || checkout.currencyCode || "USD",
                num_items: checkout.lineItems?.reduce((total, item) => total + (item.quantity || 0), 0) || 0,
              }
            }
            break

          case "checkout_completed":
          case "purchase":
            if (data.checkout) {
              const checkout = data.checkout
              const contentIds =
                checkout.lineItems?.map(
                  (item) => item.variant?.id?.toString() || item.variant?.sku || item.id?.toString() || "unknown",
                ) || []

              customData = {
                content_type: "product",
                content_ids: contentIds,
                value:
                  Number.parseFloat(checkout.totalPrice?.amount) ||
                  Number.parseFloat(checkout.subtotalPrice?.amount) ||
                  0,
                currency: checkout.totalPrice?.currencyCode || checkout.currencyCode || "USD",
                num_items: checkout.lineItems?.reduce((total, item) => total + (item.quantity || 0), 0) || 0,
                order_id: checkout.order?.id?.toString() || checkout.token || checkout.id?.toString(),
              }
            }
            break

          case "search_submitted":
            if (data.searchResult) {
              customData = {
                search_string: data.searchResult.query || "",
                content_category: "search_results",
              }
            }
            break

          default:
            customData = {
              event_source: "shopify_web_pixel",
              raw_event_name: name,
            }

            if (data.productVariant) {
              customData.product_id = data.productVariant.id?.toString()
              customData.product_title = data.productVariant.title
            }

            if (data.cart) {
              customData.cart_total = Number.parseFloat(data.cart.cost?.totalAmount?.amount) || 0
              customData.cart_currency = data.cart.cost?.totalAmount?.currencyCode || "USD"
            }
        }

        sendToGateway(fbEventName, customData, data)
      } catch (error) {
        console.error(`💥 [Web Pixel Gateway] Error processing event ${event.name}:`, error)
      }
    })

    // Send initial PageView event
    console.log("📄 [Web Pixel Gateway] Sending initial PageView event...")
    try {
      const clientInfo = getClientInfo()
      sendToGateway("PageView", {
        page_title: "Initial Load",
        page_location: clientInfo.url,
        page_path: "/",
        initial_load: true,
      })
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error sending initial PageView:", error)
    }

    console.log("🎉 [Web Pixel Gateway] Extension fully initialized and ready to track events!")
  }

  // Start initialization
  initializeWithApiSettings()
})
