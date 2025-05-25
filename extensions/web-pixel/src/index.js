// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  console.log("🎯 [Web Pixel Gateway] Starting initialization...")
  console.log("🔍 [Web Pixel Gateway] Available objects:", {
    configuration: !!configuration,
    analytics: !!analytics,
    browser: !!browser,
    browserKeys: browser ? Object.keys(browser) : null,
  })

  // Enhanced function to detect shop domain from various sources
  const detectShopDomain = () => {
    const sources = []

    try {
      // Method 1: Try browser.url (Web Pixel API)
      if (browser && browser.url) {
        sources.push("browser.url exists")
        if (browser.url.hostname) {
          console.log("🔍 [Web Pixel Gateway] Domain from browser.url.hostname:", browser.url.hostname)
          return browser.url.hostname
        }
        if (browser.url.href) {
          sources.push("browser.url.href exists")
          try {
            const url = new URL(browser.url.href)
            console.log("🔍 [Web Pixel Gateway] Domain from browser.url.href:", url.hostname)
            return url.hostname
          } catch (e) {
            sources.push(`browser.url.href parse error: ${e.message}`)
          }
        }
        if (typeof browser.url === "string") {
          sources.push("browser.url is string")
          try {
            const url = new URL(browser.url)
            console.log("🔍 [Web Pixel Gateway] Domain from browser.url string:", url.hostname)
            return url.hostname
          } catch (e) {
            sources.push(`browser.url string parse error: ${e.message}`)
          }
        }
      } else {
        sources.push("browser.url not available")
      }

      // Method 2: Try browser.document
      if (browser && browser.document) {
        sources.push("browser.document exists")
        if (browser.document.location) {
          sources.push("browser.document.location exists")
          if (browser.document.location.hostname) {
            console.log(
              "🔍 [Web Pixel Gateway] Domain from browser.document.location:",
              browser.document.location.hostname,
            )
            return browser.document.location.hostname
          }
          if (browser.document.location.href) {
            try {
              const url = new URL(browser.document.location.href)
              console.log("🔍 [Web Pixel Gateway] Domain from browser.document.location.href:", url.hostname)
              return url.hostname
            } catch (e) {
              sources.push(`browser.document.location.href parse error: ${e.message}`)
            }
          }
        }
      } else {
        sources.push("browser.document not available")
      }

      // Method 3: Try analytics context (sometimes has URL info)
      if (analytics && analytics.context) {
        sources.push("analytics.context exists")
        console.log("🔍 [Web Pixel Gateway] Analytics context:", analytics.context)
      }

      // Method 4: Try global window (might not work in Web Pixel context)
      if (typeof window !== "undefined") {
        sources.push("window exists")
        if (window.location) {
          console.log("🔍 [Web Pixel Gateway] Domain from window.location:", window.location.hostname)
          return window.location.hostname
        }
      } else {
        sources.push("window not available")
      }

      // Method 5: Try global document
      if (typeof document !== "undefined") {
        sources.push("document exists")
        if (document.location) {
          console.log("🔍 [Web Pixel Gateway] Domain from document.location:", document.location.hostname)
          return document.location.hostname
        }
      } else {
        sources.push("document not available")
      }

      // Method 6: Try to extract from any available URL in browser object
      if (browser) {
        console.log("🔍 [Web Pixel Gateway] Full browser object:", browser)
        // Look for any property that might contain a URL
        for (const [key, value] of Object.entries(browser)) {
          if (typeof value === "string" && value.includes("myshopify.com")) {
            try {
              const url = new URL(value)
              console.log(`🔍 [Web Pixel Gateway] Domain from browser.${key}:`, url.hostname)
              return url.hostname
            } catch (e) {
              // Not a valid URL, continue
            }
          }
        }
      }

      console.log("⚠️ [Web Pixel Gateway] Domain detection sources checked:", sources)
      return "unknown"
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error detecting shop domain:", error)
      console.log("🔍 [Web Pixel Gateway] Sources checked before error:", sources)
      return "unknown"
    }
  }

  // Initialize with API settings - NO HARDCODED FALLBACKS
  const initializeWithConfig = async () => {
    const detectedDomain = detectShopDomain()
    console.log("🏪 [Web Pixel Gateway] Detected shop domain:", detectedDomain)

    // MUST get configuration from API - no hardcoded fallbacks for customer-facing app
    try {
      const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
      const configUrl = `${gatewayUrl}/config`

      console.log("📡 [Web Pixel Gateway] Fetching configuration from API...")

      // Use detected domain or fail gracefully
      if (detectedDomain === "unknown") {
        console.error("❌ [Web Pixel Gateway] Cannot detect shop domain - required for customer-facing app")
        console.error("❌ [Web Pixel Gateway] This shop is not properly configured")
        return // Exit without initializing - no hardcoded fallbacks
      }

      const response = await fetch(configUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          shop: detectedDomain,
          source: "web-pixel-runtime",
          customerFacing: true, // Flag to indicate this is customer-facing
        }),
        mode: "cors",
      })

      console.log("📡 [Web Pixel Gateway] API Response status:", response.status)

      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status} ${response.statusText}`)
      }

      const apiConfig = await response.json()
      console.log("✅ [Web Pixel Gateway] API config received:", apiConfig)

      if (apiConfig.success && apiConfig.pixelId) {
        console.log("🎯 [Web Pixel Gateway] ✅ USING API CONFIG - Pixel ID:", apiConfig.pixelId)
        console.log("🎯 [Web Pixel Gateway] ✅ Shop:", apiConfig.shop)
        return initializeTracking(apiConfig.pixelId, gatewayUrl, true, "api")
      } else {
        throw new Error(`Invalid API response: ${JSON.stringify(apiConfig)}`)
      }
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] API fetch failed:", error)
      console.error("❌ [Web Pixel Gateway] Cannot initialize tracking without valid configuration")
      console.error("❌ [Web Pixel Gateway] This shop needs to be configured in the admin panel")

      // NO HARDCODED FALLBACKS - customer must configure their shop properly
      return
    }
  }

  // Initialize tracking with the given pixel ID
  const initializeTracking = (pixelId, gatewayUrl, debug, source) => {
    console.log("🚀 [Web Pixel Gateway] Initializing tracking with:")
    console.log("   📍 Pixel ID:", pixelId)
    console.log("   🔗 Gateway URL:", gatewayUrl)
    console.log("   📊 Source:", source)
    console.log("   🐛 Debug:", debug)

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
            config_source: source,
            client_info: clientInfo,
            ...(debug && { shopify_event_data: shopifyEventData }),
          },
        }

        console.log(
          `📤 [Web Pixel Gateway] Sending ${eventName} event to Pixel ${pixelId} (source: ${source}):`,
          eventData,
        )

        if (typeof fetch !== "undefined") {
          fetch(gatewayUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
            mode: "no-cors",
          })
            .then(() => {
              console.log(
                `✅ [Web Pixel Gateway] Successfully sent ${eventName} event to Pixel ${pixelId} (source: ${source})`,
              )
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

          default:
            customData = {
              event_source: "shopify_web_pixel",
              raw_event_name: name,
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

    console.log(
      `🎉 [Web Pixel Gateway] Extension fully initialized and ready to track events! (Config source: ${source})`,
    )
  }

  // Function to detect Facebook Pixels on the page
  const detectFacebookPixels = () => {
    const detectedPixels = []

    // Check for global fbq function
    if (typeof window.fbq === "function") {
      console.log("🎯 [Web Pixel Gateway] Found global fbq function")
      detectedPixels.push("Global fbq function")
    }

    // Check for Facebook Pixel script tags
    const scripts = document.querySelectorAll("script")
    for (const script of scripts) {
      const src = script.src || ""
      if (src.includes("connect.facebook.net") || src.includes("facebook.com/tr")) {
        console.log("🎯 [Web Pixel Gateway] Found Facebook Pixel script:", src)
        detectedPixels.push(src)
      }
    }

    // Check for Facebook Pixel noscript tags
    const noscripts = document.querySelectorAll("noscript")
    for (const noscript of noscripts) {
      if (noscript.innerHTML.includes("facebook.com/tr")) {
        console.log("🎯 [Web Pixel Gateway] Found Facebook Pixel noscript")
        detectedPixels.push("Noscript pixel")
      }
    }

    return detectedPixels
  }

  // Function to get pixel ID from configuration or fallback
  const getPixelId = () => {
    // First try to get from configuration
    const accountID = configuration?.accountID || null
    console.log("🎯 [Web Pixel Gateway] Account ID:", accountID)

    // Check if we have a valid account ID
    if (accountID) {
      return accountID
    }

    // Then try to get from API
    return fetch("/api/track/config")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.pixelId) {
          console.log("🎯 [Web Pixel Gateway] Got pixel ID from API:", data.pixelId)
          return data.pixelId
        }
        throw new Error("No pixel ID in API response")
      })
      .catch((error) => {
        console.error("💥 [Web Pixel Gateway] Error getting pixel ID from API:", error)
        // Fallback to environment variable
        return process.env.NEXT_PUBLIC_TEST_PIXEL_ID || "584928510540140"
      })
  }

  // Initialize Facebook Pixel
  const initFacebookPixel = (pixelId) => {
    console.log("🎯 [Web Pixel Gateway] Initializing Facebook Pixel:", pixelId)

    // Add Facebook Pixel base code
    !((f, b, e, v, n, t, s) => {
      if (f.fbq) return
      n = f.fbq = () => {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = !0
      n.version = "2.0"
      n.queue = []
      t = b.createElement(e)
      t.async = !0
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js")

    // Initialize with the pixel ID
    window.fbq("init", pixelId)
    console.log("✅ [Web Pixel Gateway] Facebook Pixel initialized")
  }

  // Subscribe to page view events
  analytics.subscribe("page_viewed", (event) => {
    console.log("🎯 [Web Pixel Gateway] Page viewed event:", event)

    // Get pixel ID and initialize Facebook Pixel
    getPixelId().then((pixelId) => {
      initFacebookPixel(pixelId)

      // Track page view
      window.fbq("track", "PageView")
      console.log("✅ [Web Pixel Gateway] Tracked PageView event")
    })
  })

  // Subscribe to product viewed events
  analytics.subscribe("product_viewed", (event) => {
    console.log("🎯 [Web Pixel Gateway] Product viewed event:", event)

    // Get pixel ID and initialize Facebook Pixel if needed
    getPixelId().then((pixelId) => {
      if (!window.fbq) {
        initFacebookPixel(pixelId)
      }

      // Track ViewContent event
      const product = event.data.productVariant
      window.fbq("track", "ViewContent", {
        content_ids: [product.id || product.product_id || product.productId || ""],
        content_name: product.title || product.name || "",
        content_type: "product",
        value: Number.parseFloat(product.price?.amount || product.price || "0"),
        currency: product.price?.currencyCode || "USD",
      })
      console.log("✅ [Web Pixel Gateway] Tracked ViewContent event")
    })
  })

  // Subscribe to add to cart events
  analytics.subscribe("product_added_to_cart", (event) => {
    console.log("🎯 [Web Pixel Gateway] Product added to cart event:", event)

    // Get pixel ID and initialize Facebook Pixel if needed
    getPixelId().then((pixelId) => {
      if (!window.fbq) {
        initFacebookPixel(pixelId)
      }

      // Track AddToCart event
      const product = event.data.cartLine
      window.fbq("track", "AddToCart", {
        content_ids: [product.merchandise?.id || product.product_id || ""],
        content_name: product.merchandise?.product?.title || "",
        content_type: "product",
        value: Number.parseFloat(product.cost?.totalAmount?.amount || "0"),
        currency: product.cost?.totalAmount?.currencyCode || "USD",
        contents: [
          {
            id: product.merchandise?.id || product.product_id || "",
            quantity: product.quantity || 1,
          },
        ],
      })
      console.log("✅ [Web Pixel Gateway] Tracked AddToCart event")
    })
  })

  // Subscribe to checkout events
  analytics.subscribe("checkout_started", (event) => {
    console.log("🎯 [Web Pixel Gateway] Checkout started event:", event)

    // Get pixel ID and initialize Facebook Pixel if needed
    getPixelId().then((pixelId) => {
      if (!window.fbq) {
        initFacebookPixel(pixelId)
      }

      // Track InitiateCheckout event
      const checkout = event.data.checkout
      window.fbq("track", "InitiateCheckout", {
        content_ids: checkout.lineItems?.map((item) => item.merchandise?.id || item.variant_id || "") || [],
        value: Number.parseFloat(checkout.totalPrice?.amount || "0"),
        currency: checkout.totalPrice?.currencyCode || "USD",
        num_items: checkout.lineItems?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0,
      })
      console.log("✅ [Web Pixel Gateway] Tracked InitiateCheckout event")
    })
  })

  // Subscribe to purchase events
  analytics.subscribe("checkout_completed", (event) => {
    console.log("🎯 [Web Pixel Gateway] Checkout completed event:", event)

    // Get pixel ID and initialize Facebook Pixel if needed
    getPixelId().then((pixelId) => {
      if (!window.fbq) {
        initFacebookPixel(pixelId)
      }

      // Track Purchase event
      const checkout = event.data.checkout
      window.fbq("track", "Purchase", {
        content_ids: checkout.lineItems?.map((item) => item.merchandise?.id || item.variant_id || "") || [],
        value: Number.parseFloat(checkout.totalPrice?.amount || "0"),
        currency: checkout.totalPrice?.currencyCode || "USD",
        contents:
          checkout.lineItems?.map((item) => ({
            id: item.merchandise?.id || item.variant_id || "",
            quantity: item.quantity || 1,
          })) || [],
      })
      console.log("✅ [Web Pixel Gateway] Tracked Purchase event")
    })
  })

  // Send debug data to our API
  try {
    const debugData = {
      shop: window.Shopify?.shop || document.location.hostname,
      configAccountId: configuration?.accountID || null,
      configData: configuration,
      analyticsData: window.analytics || {},
      detectedPixels: detectFacebookPixels(),
    }

    fetch("/api/debug/web-pixel-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(debugData),
      keepalive: true,
    }).catch((error) => {
      console.error("💥 [Web Pixel Gateway] Error sending debug data:", error)
    })
  } catch (error) {
    console.error("💥 [Web Pixel Gateway] Error preparing debug data:", error)
  }

  // Start initialization
  initializeWithConfig()
})
