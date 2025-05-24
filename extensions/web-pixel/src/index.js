// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  console.log("🎯 [Web Pixel Gateway] Starting initialization...")

  // Get gateway configuration
  const settings = configuration?.settings || {}
  const gatewayUrl = settings.gatewayUrl || "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
  const debug = settings.debug || true

  console.log("🔧 [Web Pixel Gateway] Configuration:", {
    gatewayUrl,
    debug,
    configurationReceived: !!configuration,
    settingsReceived: !!settings,
    timestamp: new Date().toISOString(),
  })

  // Function to detect existing Facebook Pixel on the page
  const detectFacebookPixel = () => {
    try {
      // Method 1: Check for fbq global function
      if (typeof window !== "undefined" && window.fbq && window.fbq._pixelId) {
        console.log("🔍 [Web Pixel Gateway] Found Facebook Pixel via fbq._pixelId:", window.fbq._pixelId)
        return window.fbq._pixelId
      }

      // Method 2: Check fbq queue for init calls
      if (typeof window !== "undefined" && window.fbq && window.fbq.queue) {
        for (const call of window.fbq.queue) {
          if (call[0] === "init" && call[1]) {
            console.log("🔍 [Web Pixel Gateway] Found Facebook Pixel via fbq queue:", call[1])
            return call[1]
          }
        }
      }

      // Method 3: Check for Facebook Pixel script tags
      if (typeof document !== "undefined") {
        const scripts = document.querySelectorAll("script")
        for (const script of scripts) {
          const content = script.textContent || script.innerHTML
          // Look for fbq('init', 'PIXEL_ID') pattern
          const initMatch = content.match(/fbq\s*\(\s*['"]init['"],\s*['"](\d+)['"]/)
          if (initMatch && initMatch[1]) {
            console.log("🔍 [Web Pixel Gateway] Found Facebook Pixel via script tag:", initMatch[1])
            return initMatch[1]
          }
        }
      }

      // Method 4: Check for data attributes or meta tags
      if (typeof document !== "undefined") {
        const metaPixel = document.querySelector('meta[property="fb:pixel_id"]')
        if (metaPixel && metaPixel.content) {
          console.log("🔍 [Web Pixel Gateway] Found Facebook Pixel via meta tag:", metaPixel.content)
          return metaPixel.content
        }
      }

      console.log("⚠️ [Web Pixel Gateway] No existing Facebook Pixel detected on page")
      return null
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error detecting Facebook Pixel:", error)
      return null
    }
  }

  // Function to get shop domain from current URL
  const getShopDomain = () => {
    try {
      let hostname = "unknown"
      if (browser && browser.url && browser.url.hostname) {
        hostname = browser.url.hostname
      } else if (typeof window !== "undefined" && window.location) {
        hostname = window.location.hostname
      }

      console.log("🏪 [Web Pixel Gateway] Detected shop domain:", hostname)
      return hostname
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error getting shop domain:", error)
      return "unknown"
    }
  }

  // Function to fetch pixel configuration from database
  const fetchPixelConfig = async (detectedPixelId, shopDomain) => {
    try {
      console.log("📡 [Web Pixel Gateway] Fetching pixel config for:", { detectedPixelId, shopDomain })

      const response = await fetch(`${gatewayUrl}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelId: detectedPixelId,
          shop: shopDomain,
          source: "web-pixel-detection",
        }),
        mode: "cors",
      })

      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status}`)
      }

      const config = await response.json()
      console.log("✅ [Web Pixel Gateway] Pixel config fetched:", config)
      return config
    } catch (error) {
      console.error("❌ [Web Pixel Gateway] Failed to fetch pixel config:", error)
      return null
    }
  }

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

  // Main initialization function
  const initializePixelGateway = async () => {
    try {
      // Step 1: Detect existing Facebook Pixel
      const detectedPixelId = detectFacebookPixel()
      const shopDomain = getShopDomain()

      if (!detectedPixelId) {
        console.log("⚠️ [Web Pixel Gateway] No Facebook Pixel detected - gateway will not activate")
        return
      }

      console.log("🎯 [Web Pixel Gateway] Detected Facebook Pixel ID:", detectedPixelId)

      // Step 2: Fetch configuration from database
      const pixelConfig = await fetchPixelConfig(detectedPixelId, shopDomain)

      if (!pixelConfig || !pixelConfig.success) {
        console.log("⚠️ [Web Pixel Gateway] No configuration found for pixel:", detectedPixelId)
        console.log("💡 [Web Pixel Gateway] Add this pixel to your database to enable gateway tracking")
        return
      }

      const { pixelId, accessToken, gatewayEnabled } = pixelConfig

      if (!gatewayEnabled) {
        console.log("⚠️ [Web Pixel Gateway] Gateway disabled for pixel:", pixelId)
        return
      }

      console.log("✅ [Web Pixel Gateway] Gateway enabled for pixel:", pixelId)

      // Step 3: Set up event tracking
      const sendToGateway = (eventName, customData = {}, shopifyEventData = {}) => {
        try {
          const cookies = getCookies()
          const clientInfo = getClientInfo()

          const userData = {
            client_user_agent: clientInfo.user_agent,
            fbp: cookies.fbp,
            fbc: cookies.fbc,
          }

          // Add customer data if available
          if (shopifyEventData.customer) {
            if (shopifyEventData.customer.email) userData.em = shopifyEventData.customer.email
            if (shopifyEventData.customer.phone) userData.ph = shopifyEventData.customer.phone
          }

          const eventData = {
            pixelId: pixelId,
            accessToken: accessToken, // Include access token for gateway
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_source_url: clientInfo.url,
            user_data: userData,
            custom_data: {
              ...customData,
              shopify_source: true,
              shop_domain: shopDomain,
              client_info: clientInfo,
              ...(debug && { shopify_event_data: shopifyEventData }),
            },
          }

          console.log(`📤 [Web Pixel Gateway] Sending ${eventName} to pixel ${pixelId}:`, eventData)

          fetch(gatewayUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
            mode: "no-cors",
          })
            .then(() => {
              console.log(`✅ [Web Pixel Gateway] Successfully sent ${eventName} to pixel ${pixelId}`)
            })
            .catch((error) => {
              console.error(`❌ [Web Pixel Gateway] Failed to send ${eventName}:`, error)
            })
        } catch (error) {
          console.error(`💥 [Web Pixel Gateway] Error sending ${eventName}:`, error)
        }
      }

      // Step 4: Set up event listeners
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

      analytics.subscribe("all_events", (event) => {
        try {
          const { name, data } = event
          console.log(`🔔 [Web Pixel Gateway] Received event: ${name}`, { name, data })

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
                  cart.lines?.map((line) => line.merchandise?.id?.toString() || line.merchandise?.sku || "unknown") ||
                  []

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
              // For other events, include available data
              customData = {
                event_source: "shopify_web_pixel",
                raw_event_name: name,
              }

              // Safely extract common data
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

      // Send initial PageView
      console.log("📄 [Web Pixel Gateway] Sending initial PageView...")
      const clientInfo = getClientInfo()
      sendToGateway("PageView", {
        page_title: "Initial Load",
        page_location: clientInfo.url,
        page_path: "/",
        initial_load: true,
      })

      console.log("🎉 [Web Pixel Gateway] Extension fully initialized for pixel:", pixelId)
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Initialization failed:", error)
    }
  }

  // Start initialization
  initializePixelGateway()
})
