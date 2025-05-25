// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  console.log("🎯 [Web Pixel Gateway] Starting initialization...")
  console.log("🔍 [Web Pixel Gateway] Configuration:", configuration)
  console.log("🔍 [Web Pixel Gateway] Analytics:", analytics)

  // Enhanced function to detect existing Facebook Pixels on the website
  const detectExistingPixels = () => {
    const detectedPixels = []

    try {
      // Method 1: Check for fbq global function
      if (typeof window !== "undefined" && window.fbq && window.fbq._pixelId) {
        console.log("🔍 [Pixel Detection] Found fbq._pixelId:", window.fbq._pixelId)
        detectedPixels.push(window.fbq._pixelId)
      }

      // Method 2: Check for Facebook Pixel script tags
      if (typeof document !== "undefined") {
        const scripts = document.querySelectorAll("script")
        scripts.forEach((script) => {
          const content = script.textContent || script.innerHTML

          // Look for fbq('init', 'PIXEL_ID') patterns
          const initMatches = content.match(/fbq\s*\(\s*['"]init['"],\s*['"](\d+)['"]/g)
          if (initMatches) {
            initMatches.forEach((match) => {
              const pixelMatch = match.match(/['"](\d+)['"]/)
              if (pixelMatch && pixelMatch[1]) {
                console.log("🔍 [Pixel Detection] Found pixel in script:", pixelMatch[1])
                if (!detectedPixels.includes(pixelMatch[1])) {
                  detectedPixels.push(pixelMatch[1])
                }
              }
            })
          }
        })
      }

      // Method 3: Check for _fbp cookie (indicates pixel presence)
      if (typeof document !== "undefined") {
        const fbpCookie = document.cookie.match(/_fbp=([^;]+)/)
        if (fbpCookie) {
          console.log("🔍 [Pixel Detection] Found _fbp cookie, indicating pixel presence")
        }
      }

      console.log("🎯 [Pixel Detection] Total detected pixels:", detectedPixels)
      return detectedPixels
    } catch (error) {
      console.error("💥 [Pixel Detection] Error detecting pixels:", error)
      return []
    }
  }

  // Get current page URL for shop identification
  const getCurrentUrl = () => {
    try {
      if (browser && browser.url && browser.url.href) {
        return browser.url.href
      }
      if (typeof window !== "undefined" && window.location) {
        return window.location.href
      }
      return "unknown"
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error getting current URL:", error)
      return "unknown"
    }
  }

  // Get shop domain from URL
  const getShopDomain = () => {
    try {
      const url = getCurrentUrl()
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch (error) {
      console.error("💥 [Web Pixel Gateway] Error getting shop domain:", error)
      if (typeof window !== "undefined" && window.location) {
        return window.location.hostname
      }
      return "unknown"
    }
  }

  // Initialize with pixel detection and smart configuration
  const initializeWithDetection = async () => {
    const currentUrl = getCurrentUrl()
    const detectedPixels = detectExistingPixels()
    const shopDomain = getShopDomain()

    console.log("🌐 [Web Pixel Gateway] Current URL:", currentUrl)
    console.log("🏪 [Web Pixel Gateway] Shop Domain:", shopDomain)
    console.log("🎯 [Web Pixel Gateway] Detected pixels:", detectedPixels)

    // First try to get pixel ID from configuration
    let pixelId = configuration.accountID || null
    console.log("🎯 [Web Pixel Gateway] Pixel ID from configuration:", pixelId)

    // If no pixel ID in configuration, try to get from API
    if (!pixelId) {
      try {
        console.log("🔍 [Web Pixel Gateway] Fetching pixel ID from API...")
        const configResponse = await fetch(
          `https://v0-node-js-serverless-api-lake.vercel.app/api/track/config?shop=${shopDomain}`,
        )

        if (configResponse.ok) {
          const config = await configResponse.json()
          console.log("🔍 [Web Pixel Gateway] API Response:", config)

          if (config.success && config.pixelId) {
            console.log("✅ [Web Pixel Gateway] Got pixel ID from API:", config.pixelId)
            pixelId = config.pixelId
          } else {
            console.error("❌ [Web Pixel Gateway] API returned no pixel ID:", config)
          }
        } else {
          console.error("❌ [Web Pixel Gateway] Failed to fetch pixel config:", await configResponse.text())
        }
      } catch (error) {
        console.error("💥 [Web Pixel Gateway] Error fetching pixel config:", error)
      }
    }

    // If still no pixel ID, try detected pixels
    if (!pixelId && detectedPixels.length > 0) {
      pixelId = detectedPixels[0]
      console.log("🎯 [Web Pixel Gateway] Using detected pixel ID:", pixelId)
    }

    // If still no pixel ID, use fallback
    if (!pixelId) {
      pixelId = "584928510540140" // Fallback to test pixel
      console.log("⚠️ [Web Pixel Gateway] Using fallback pixel ID:", pixelId)
    }

    // Initialize tracking with the pixel ID
    initializeTracking(pixelId, "https://v0-node-js-serverless-api-lake.vercel.app/api/track", true, "auto-detection")
  }

  // Initialize tracking with the given pixel ID
  const initializeTracking = (pixelId, gatewayUrl, debug, source) => {
    console.log("🚀 [Web Pixel Gateway] Initializing tracking with:")
    console.log("   📍 Pixel ID:", pixelId)
    console.log("   🔗 Gateway URL:", gatewayUrl)
    console.log("   📊 Source:", source)

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
        const url = getCurrentUrl()
        let referrer = ""

        if (browser && browser.document && browser.document.referrer) {
          referrer = browser.document.referrer
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
          url: getCurrentUrl(),
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
        const shopDomain = getShopDomain()

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
            shop_domain: shopDomain,
            client_info: clientInfo,
            ...(debug && { shopify_event_data: shopifyEventData }),
          },
        }

        console.log(`📤 [Web Pixel Gateway] Sending ${eventName} event:`, eventData)

        if (typeof fetch !== "undefined") {
          fetch(gatewayUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
            keepalive: true, // Ensure the request completes even if the page unloads
          })
            .then((response) => {
              if (response.ok) {
                console.log(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event`)
                return response.json()
              } else {
                throw new Error(`Gateway returned ${response.status}`)
              }
            })
            .then((data) => {
              console.log(`✅ [Web Pixel Gateway] Response data:`, data)
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
        console.log(`🔔 [Web Pixel Gateway] Received Shopify event: ${name}`)
        console.log(`🔔 [Web Pixel Gateway] Event data:`, data)

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

          case "checkout_completed":
            if (data.checkout) {
              const checkout = data.checkout
              customData = {
                content_type: "product",
                content_ids:
                  checkout.lineItems?.map((item) => item.variant?.id || item.variant?.sku || "unknown") || [],
                value: Number.parseFloat(checkout.totalPrice?.amount) || 0,
                currency: checkout.totalPrice?.currencyCode || "USD",
                num_items: checkout.lineItems?.reduce((total, item) => total + (item.quantity || 1), 0) || 1,
                order_id: checkout.order?.id || checkout.id,
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

    console.log(`🎉 [Web Pixel Gateway] Extension fully initialized! (Config source: ${source})`)
  }

  // Start initialization with smart detection
  initializeWithDetection()
})
