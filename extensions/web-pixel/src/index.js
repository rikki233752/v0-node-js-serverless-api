// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  console.log("🎯 [Web Pixel Gateway] Starting initialization...")

  // DETAILED CONFIGURATION LOGGING
  console.log("🔍 [Web Pixel Gateway] Raw configuration object:", configuration)
  console.log("🔍 [Web Pixel Gateway] Configuration type:", typeof configuration)
  console.log("🔍 [Web Pixel Gateway] Configuration keys:", configuration ? Object.keys(configuration) : "null")

  if (configuration && configuration.settings) {
    console.log("🔍 [Web Pixel Gateway] Raw settings:", configuration.settings)
    console.log("🔍 [Web Pixel Gateway] Settings type:", typeof configuration.settings)
    console.log("🔍 [Web Pixel Gateway] Settings keys:", Object.keys(configuration.settings))
  } else {
    console.log("❌ [Web Pixel Gateway] No configuration.settings found!")
  }

  // Safely handle missing configuration
  const settings = configuration?.settings || {}
  console.log("🔍 [Web Pixel Gateway] Processed settings:", settings)

  const accountID = settings.accountID || "default-account"
  console.log("🔍 [Web Pixel Gateway] AccountID extraction:", {
    "settings.accountID": settings.accountID,
    "final accountID": accountID,
    "was fallback used": accountID === "default-account",
  })

  // IMPORTANT: Use the accountID as the actual Facebook Pixel ID
  const pixelId = accountID // This should be your real Facebook Pixel ID
  const gatewayUrl = settings.gatewayUrl || "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
  const debug = settings.debug || true // Enable debug by default for testing

  // Always log these important details
  console.log("🔧 [Web Pixel Gateway] Final Configuration:", {
    accountID,
    pixelId,
    gatewayUrl,
    debug,
    configurationReceived: !!configuration,
    settingsReceived: !!settings,
    timestamp: new Date().toISOString(),
  })

  // Debug logging function
  const log = (message, data) => {
    console.log(`🎯 [Web Pixel Gateway] ${message}`, data)
  }

  // Validate required settings
  if (!accountID || accountID === "default-account") {
    console.error("❌ [Web Pixel Gateway] Error: Account ID is missing or using fallback value")
    console.error("❌ [Web Pixel Gateway] This means the Web Pixel settings are not configured correctly")
    console.error("❌ [Web Pixel Gateway] Expected: accountID should be your Facebook Pixel ID")
    console.error("❌ [Web Pixel Gateway] Actual:", { accountID, settings })
    // Continue anyway for debugging
  }

  console.log("✅ [Web Pixel Gateway] Using Pixel ID:", pixelId)

  // Helper function to safely get cookies
  const getCookies = () => {
    const cookies = {
      fbp: null,
      fbc: null,
    }

    try {
      // Use browser.cookie if available (Web Pixel API)
      if (browser && browser.cookie) {
        const cookieData = browser.cookie.get()

        // Handle different cookie API formats
        let cookieString = ""
        if (typeof cookieData === "string") {
          cookieString = cookieData
        } else if (cookieData && typeof cookieData === "object") {
          // If it's an object, try to extract cookie string
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
      // Silently handle cookie errors - not critical for functionality
      log("Cookie reading not available in this context", { error: e.message })
    }

    return cookies
  }

  // Helper function to get client information (Web Pixel compatible)
  const getClientInfo = () => {
    try {
      // Use browser API if available, with fallbacks
      let url = "https://unknown.com"
      let referrer = ""

      if (browser) {
        if (browser.url && browser.url.href) {
          url = browser.url.href
        }
        if (browser.document && browser.document.referrer) {
          referrer = browser.document.referrer
        }
      }

      return {
        user_agent: browser?.navigator?.userAgent || "Unknown",
        language: browser?.navigator?.language || "en",
        screen_resolution: "unknown", // Screen not available in Web Pixel context
        url: url,
        referrer: referrer,
        timestamp: new Date().toISOString(),
      }
    } catch (e) {
      log("Error getting client info", e)
      return {
        user_agent: "Unknown",
        language: "en",
        screen_resolution: "unknown",
        url: "https://unknown.com",
        referrer: "",
        timestamp: new Date().toISOString(),
      }
    }
  }

  // Helper function to send event to Meta Conversions API Gateway
  const sendToGateway = (eventName, customData = {}, shopifyEventData = {}) => {
    try {
      // Get cookies and client info
      const cookies = getCookies()
      const clientInfo = getClientInfo()

      // Prepare user data for Meta Conversions API
      const userData = {
        client_user_agent: clientInfo.user_agent,
        fbp: cookies.fbp,
        fbc: cookies.fbc,
      }

      // Add any email or phone data if available in the event
      if (shopifyEventData.customer) {
        if (shopifyEventData.customer.email) {
          userData.em = shopifyEventData.customer.email
        }
        if (shopifyEventData.customer.phone) {
          userData.ph = shopifyEventData.customer.phone
        }
      }

      // Prepare event data for the gateway
      const eventData = {
        pixelId: pixelId, // Use the actual Facebook Pixel ID
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: clientInfo.url,
        user_data: userData,
        custom_data: {
          ...customData,
          // Add Shopify-specific data
          shopify_source: true,
          account_id: accountID,
          client_info: clientInfo,
          // Include original Shopify event data for debugging
          ...(debug && { shopify_event_data: shopifyEventData }),
        },
      }

      console.log(`📤 [Web Pixel Gateway] Sending ${eventName} event to Pixel ${pixelId}:`, eventData)

      // Use fetch only (Image not available in Web Pixel context)
      if (typeof fetch !== "undefined") {
        // Try POST request first
        fetch(gatewayUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
          mode: "no-cors", // Avoid CORS issues
        })
          .then(() => {
            console.log(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event to Pixel ${pixelId}`)
          })
          .catch((error) => {
            console.warn(`⚠️ [Web Pixel Gateway] POST failed for ${eventName}, trying GET:`, error)

            // Fallback to GET request with query parameters
            const queryString = `d=${encodeURIComponent(JSON.stringify(eventData))}&t=${Date.now()}`
            const getUrl = `${gatewayUrl}?${queryString}`

            fetch(getUrl, {
              method: "GET",
              mode: "no-cors",
            })
              .then(() => {
                console.log(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event via GET to Pixel ${pixelId}`)
              })
              .catch((getError) => {
                console.error(`❌ [Web Pixel Gateway] Both POST and GET failed for ${eventName}:`, getError)
              })
          })
      } else {
        console.error(`❌ [Web Pixel Gateway] Fetch not available, cannot send ${eventName} event`)
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

      // Map to Facebook event name
      const fbEventName = eventMapping[name] || name

      // Process event-specific data
      let customData = {}

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

      // Send event to gateway
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
})
