// Web Pixel Extension - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  console.log("🎯 [Web Pixel Gateway] Starting initialization...")

  // Configuration
  const GATEWAY_URL = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
  let detectedShopDomain = null
  let pixelId = null

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

  // Fetch pixel ID from config API
  const fetchPixelId = async (shopDomain) => {
    if (!shopDomain) return null

    try {
      console.log(`📡 [Web Pixel Gateway] Fetching pixel ID for shop: ${shopDomain}`)
      const response = await fetch(`${GATEWAY_URL}/config?shop=${encodeURIComponent(shopDomain)}`)

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
      console.error(`💥 [Web Pixel Gateway] Error fetching pixel ID:`, error)
      return null
    }
  }

  // Send event to gateway
  const sendToGateway = (eventName, customData = {}, shopifyEventData = {}) => {
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
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: shopifyEventData.context?.window?.location?.href || "https://unknown.com",
        user_data: userData,
        custom_data: {
          ...customData,
          shopify_source: true,
        },
        shop_domain: detectedShopDomain,
      }

      console.log(`📤 [Web Pixel Gateway] Sending ${eventName} event for shop: ${detectedShopDomain || "unknown"}`)

      fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
        mode: "no-cors",
      })
        .then(() => console.log(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event`))
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

  // Process event data
  const processEventData = (name, data) => {
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

    sendToGateway(fbEventName, customData, data)
  }

  // Initialize
  const initialize = () => {
    console.log("🚀 [Web Pixel Gateway] Initializing...")

    // Best Practice: Register shop domain detection inside page_viewed event
    analytics.subscribe("page_viewed", (shopifyEventData) => {
      // Try to detect shop domain if not already detected
      if (!detectedShopDomain) {
        if (shopifyEventData.context?.document?.location?.hostname) {
          detectedShopDomain = shopifyEventData.context.document.location.hostname
          console.log(`✅ [Web Pixel Gateway] Detected shop domain from document.location:`, detectedShopDomain)
        } else if (shopifyEventData.context?.window?.location?.hostname) {
          detectedShopDomain = shopifyEventData.context.window.location.hostname
          console.log(`✅ [Web Pixel Gateway] Detected shop domain from window.location:`, detectedShopDomain)
        } else if (shopifyEventData.context?.window?.location?.href) {
          try {
            const url = new URL(shopifyEventData.context.window.location.href)
            detectedShopDomain = url.hostname
            console.log(`✅ [Web Pixel Gateway] Extracted shop domain from URL:`, detectedShopDomain)
          } catch (e) {
            console.log(`⚠️ [Web Pixel Gateway] Could not extract shop domain from URL`)
          }
        } else if (shopifyEventData.shop) {
          detectedShopDomain = shopifyEventData.shop
          console.log(`✅ [Web Pixel Gateway] Found shop domain in Shopify data:`, detectedShopDomain)
        }

        // Fetch pixel ID once we have the shop domain
        if (detectedShopDomain) {
          fetchPixelId(detectedShopDomain).then((id) => {
            if (id) {
              pixelId = id
              console.log(`🎯 [Web Pixel Gateway] Using pixel ID from config: ${pixelId}`)
            }
          })
        }
      }

      // Process the page_viewed event
      processEventData("page_viewed", shopifyEventData)
    })

    // Subscribe to all other events
    analytics.subscribe("all_events", (event) => {
      try {
        const { name, data } = event
        if (name !== "page_viewed") {
          // Skip page_viewed as it's handled separately
          processEventData(name, data)
        }
      } catch (error) {
        console.error(`💥 [Web Pixel Gateway] Error processing ${event.name}:`, error)
      }
    })

    console.log(`🎉 [Web Pixel Gateway] Extension fully initialized!`)
  }

  // Start initialization
  initialize()
})
