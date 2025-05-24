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

  // Initialize with API settings or fallback
  const initializeWithConfig = async () => {
    const detectedDomain = detectShopDomain()
    console.log("🏪 [Web Pixel Gateway] Detected shop domain:", detectedDomain)

    // Always try API first, even with unknown domain
    try {
      const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
      const configUrl = `${gatewayUrl}/config`

      console.log("📡 [Web Pixel Gateway] Attempting API fetch regardless of domain detection...")

      // Try with detected domain first
      let shopToTry = detectedDomain

      // If domain is unknown, try some common patterns
      if (detectedDomain === "unknown") {
        // Try to get domain from referrer or any available context
        if (browser && browser.document && browser.document.referrer) {
          try {
            const referrerUrl = new URL(browser.document.referrer)
            if (referrerUrl.hostname.includes("myshopify.com")) {
              shopToTry = referrerUrl.hostname
              console.log("🔍 [Web Pixel Gateway] Using domain from referrer:", shopToTry)
            }
          } catch (e) {
            console.log("⚠️ [Web Pixel Gateway] Could not parse referrer URL")
          }
        }

        // If still unknown, try hardcoded shop domain for testing
        if (shopToTry === "unknown") {
          shopToTry = "test-rikki-new.myshopify.com"
          console.log("🔄 [Web Pixel Gateway] Using test shop domain for API call:", shopToTry)
        }
      }

      const response = await fetch(configUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          shop: shopToTry,
          source: "web-pixel-runtime",
          detectedDomain: detectedDomain,
          fallbackUsed: detectedDomain === "unknown",
        }),
        mode: "cors",
      })

      console.log("📡 [Web Pixel Gateway] API Response status:", response.status)
      console.log("📡 [Web Pixel Gateway] API Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status} ${response.statusText}`)
      }

      const apiConfig = await response.json()
      console.log("✅ [Web Pixel Gateway] API config received:", apiConfig)

      if (apiConfig.success && apiConfig.pixelId) {
        console.log("🎯 [Web Pixel Gateway] ✅ USING API CONFIG - Pixel ID:", apiConfig.pixelId)
        console.log("🎯 [Web Pixel Gateway] ✅ API SOURCE:", apiConfig.source || "api")
        return initializeTracking(apiConfig.pixelId, gatewayUrl, true, "api")
      } else {
        throw new Error(`Invalid API response: ${JSON.stringify(apiConfig)}`)
      }
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] API fetch failed:", error)
      console.log("🔄 [Web Pixel Gateway] ❌ FALLING BACK TO HARDCODED CONFIG")

      // Use hardcoded fallback for your store
      return initializeTracking(
        "864857281256627",
        "https://v0-node-js-serverless-api-lake.vercel.app/api/track",
        true,
        "fallback",
      )
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
            config_source: source, // Track whether this came from API or fallback
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

  // Start initialization
  initializeWithConfig()
})
