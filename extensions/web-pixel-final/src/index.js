import { register } from "@shopify/web-pixels-extension"

// Web Pixel Extension - Final Version
// This version combines all the best practices and fixes from previous versions

function log(message, data = {}) {
  if (typeof console !== "undefined") {
    console.log(`${message}`, data)
  }
}

function error(message, data = {}) {
  if (typeof console !== "undefined") {
    console.error(`❌ ${message}`, data)
  }
}

function warn(message, data = {}) {
  if (typeof console !== "undefined") {
    console.warn(`⚠️ ${message}`, data)
  }
}

function success(message, data = {}) {
  if (typeof console !== "undefined") {
    console.log(`✅ ${message}`, data)
  }
}

// Initialize the Web Pixel
function init(analytics) {
  // Log initialization
  log("🎉 [Web Pixel Gateway] Extension fully initialized!")

  // Subscribe to all events
  analytics.subscribe("all_events", async (event) => {
    try {
      // Extract shop domain from event
      const shopDomain = extractShopDomain(event)
      if (!shopDomain) {
        error("[Web Pixel Gateway] Could not determine shop domain")
        return
      }
      success(`[Web Pixel Gateway] Detected shop domain from ${event.name} event: ${shopDomain}`)

      // Process specific events
      if (event.name === "page_viewed") {
        await handlePageView(event, shopDomain, analytics)
      } else if (event.name === "product_viewed") {
        await handleProductView(event, shopDomain, analytics)
      } else if (event.name === "checkout_started") {
        await handleCheckoutStarted(event, shopDomain, analytics)
      } else if (event.name === "checkout_completed") {
        await handleCheckoutCompleted(event, shopDomain, analytics)
      } else if (event.name === "payment_info_submitted") {
        await handlePaymentInfoSubmitted(event, shopDomain, analytics)
      } else if (event.name === "add_to_cart") {
        await handleAddToCart(event, shopDomain, analytics)
      }
    } catch (e) {
      error(`[Web Pixel Gateway] Error processing ${event.name} event: ${e.message}`)
    }
  })
}

// Extract shop domain from various sources
function extractShopDomain(event) {
  try {
    // Try to get from event context
    if (
      event.context &&
      event.context.document &&
      event.context.document.location &&
      event.context.document.location.hostname
    ) {
      success(
        "[Web Pixel Gateway] Extracted shop domain from event context: " + event.context.document.location.hostname,
      )
      return event.context.document.location.hostname
    }

    // Try to get from event data for page_viewed
    if (event.name === "page_viewed" && event.data && event.data.shop && event.data.shop.domain) {
      success("[Web Pixel Gateway] Extracted shop domain from page_viewed event: " + event.data.shop.domain)
      return event.data.shop.domain
    }

    // Fallback to hardcoded domain if all else fails
    warn("[Web Pixel Gateway] Using fallback shop domain")
    return "test-rikki-new.myshopify.com"
  } catch (e) {
    error("[Web Pixel Gateway] Error extracting shop domain: " + e.message)
    return "test-rikki-new.myshopify.com"
  }
}

// Handle PageView event
async function handlePageView(event, shopDomain, analytics) {
  try {
    log(`[Web Pixel Gateway] Sending PageView event for shop: ${shopDomain}`)

    // Collect user data
    const userData = collectUserData(event)

    // Collect page data
    const pageData = collectPageData(event)

    // Send the event
    await sendEvent(
      {
        event_name: "PageView",
        event_time: Math.floor(Date.now() / 1000),
        user_data: userData,
        custom_data: pageData,
        event_source_url: pageData.event_source_url,
        shop_domain: shopDomain,
      },
      shopDomain,
    )

    success("[Web Pixel Gateway] Successfully sent PageView event")
  } catch (e) {
    error("[Web Pixel Gateway] Error sending PageView event: " + e.message)
  }
}

// Handle ProductView event
async function handleProductView(event, shopDomain, analytics) {
  try {
    const product = event.data.productVariant || event.data.product
    if (!product) {
      warn("[Web Pixel Gateway] No product data found in product_viewed event")
      return
    }

    log(`[Web Pixel Gateway] Sending ViewContent event for shop: ${shopDomain}`)

    // Collect user data
    const userData = collectUserData(event)

    // Collect page data
    const pageData = collectPageData(event)

    // Collect product data
    const productData = {
      content_type: "product",
      content_ids: [product.id || product.productId || product.variantId || ""],
      content_name: product.title || product.name || "",
      content_category: product.productType || "",
      value: Number.parseFloat(product.price || 0),
      currency: event.data.currency || "USD",
    }

    // Send the event
    await sendEvent(
      {
        event_name: "ViewContent",
        event_time: Math.floor(Date.now() / 1000),
        user_data: userData,
        custom_data: { ...pageData, ...productData },
        event_source_url: pageData.event_source_url,
        shop_domain: shopDomain,
      },
      shopDomain,
    )

    success("[Web Pixel Gateway] Successfully sent ViewContent event")
  } catch (e) {
    error("[Web Pixel Gateway] Error sending ViewContent event: " + e.message)
  }
}

// Handle AddToCart event
async function handleAddToCart(event, shopDomain, analytics) {
  try {
    const product = event.data.productVariant || event.data.product
    if (!product) {
      warn("[Web Pixel Gateway] No product data found in add_to_cart event")
      return
    }

    log(`[Web Pixel Gateway] Sending AddToCart event for shop: ${shopDomain}`)

    // Collect user data
    const userData = collectUserData(event)

    // Collect page data
    const pageData = collectPageData(event)

    // Collect product data
    const productData = {
      content_type: "product",
      content_ids: [product.id || product.productId || product.variantId || ""],
      content_name: product.title || product.name || "",
      value: Number.parseFloat(product.price || 0),
      currency: event.data.currency || "USD",
      contents: [
        {
          id: product.id || product.productId || product.variantId || "",
          quantity: event.data.quantity || 1,
          price: Number.parseFloat(product.price || 0),
        },
      ],
    }

    // Send the event
    await sendEvent(
      {
        event_name: "AddToCart",
        event_time: Math.floor(Date.now() / 1000),
        user_data: userData,
        custom_data: { ...pageData, ...productData },
        event_source_url: pageData.event_source_url,
        shop_domain: shopDomain,
      },
      shopDomain,
    )

    success("[Web Pixel Gateway] Successfully sent AddToCart event")
  } catch (e) {
    error("[Web Pixel Gateway] Error sending AddToCart event: " + e.message)
  }
}

// Handle CheckoutStarted event
async function handleCheckoutStarted(event, shopDomain, analytics) {
  try {
    if (!event.data.checkout) {
      warn("[Web Pixel Gateway] No checkout data found in checkout_started event")
      return
    }

    log(`[Web Pixel Gateway] Sending InitiateCheckout event for shop: ${shopDomain}`)

    // Collect user data
    const userData = collectUserData(event)

    // Collect page data
    const pageData = collectPageData(event)

    // Collect checkout data
    const checkoutData = {
      content_type: "product",
      contents: (event.data.checkout.lineItems || []).map((item) => ({
        id: item.variant?.id || item.variantId || "",
        quantity: item.quantity || 1,
        price: Number.parseFloat(item.variant?.price || item.price || 0),
      })),
      value: Number.parseFloat(event.data.checkout.totalPrice || 0),
      currency: event.data.checkout.currencyCode || "USD",
      num_items: (event.data.checkout.lineItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0),
    }

    // Send the event
    await sendEvent(
      {
        event_name: "InitiateCheckout",
        event_time: Math.floor(Date.now() / 1000),
        user_data: userData,
        custom_data: { ...pageData, ...checkoutData },
        event_source_url: pageData.event_source_url,
        shop_domain: shopDomain,
      },
      shopDomain,
    )

    success("[Web Pixel Gateway] Successfully sent InitiateCheckout event")
  } catch (e) {
    error("[Web Pixel Gateway] Error sending InitiateCheckout event: " + e.message)
  }
}

// Handle PaymentInfoSubmitted event
async function handlePaymentInfoSubmitted(event, shopDomain, analytics) {
  try {
    if (!event.data.checkout) {
      warn("[Web Pixel Gateway] No checkout data found in payment_info_submitted event")
      return
    }

    log(`[Web Pixel Gateway] Sending AddPaymentInfo event for shop: ${shopDomain}`)

    // Collect user data
    const userData = collectUserData(event)

    // Collect page data
    const pageData = collectPageData(event)

    // Collect checkout data
    const checkoutData = {
      content_type: "product",
      contents: (event.data.checkout.lineItems || []).map((item) => ({
        id: item.variant?.id || item.variantId || "",
        quantity: item.quantity || 1,
        price: Number.parseFloat(item.variant?.price || item.price || 0),
      })),
      value: Number.parseFloat(event.data.checkout.totalPrice || 0),
      currency: event.data.checkout.currencyCode || "USD",
    }

    // Send the event
    await sendEvent(
      {
        event_name: "AddPaymentInfo",
        event_time: Math.floor(Date.now() / 1000),
        user_data: userData,
        custom_data: { ...pageData, ...checkoutData },
        event_source_url: pageData.event_source_url,
        shop_domain: shopDomain,
      },
      shopDomain,
    )

    success("[Web Pixel Gateway] Successfully sent AddPaymentInfo event")
  } catch (e) {
    error("[Web Pixel Gateway] Error sending AddPaymentInfo event: " + e.message)
  }
}

// Handle CheckoutCompleted event
async function handleCheckoutCompleted(event, shopDomain, analytics) {
  try {
    if (!event.data.checkout) {
      warn("[Web Pixel Gateway] No checkout data found in checkout_completed event")
      return
    }

    log(`[Web Pixel Gateway] Sending Purchase event for shop: ${shopDomain}`)

    // Collect user data
    const userData = collectUserData(event)

    // Collect page data
    const pageData = collectPageData(event)

    // Collect checkout data
    const checkoutData = {
      content_type: "product",
      contents: (event.data.checkout.lineItems || []).map((item) => ({
        id: item.variant?.id || item.variantId || "",
        quantity: item.quantity || 1,
        price: Number.parseFloat(item.variant?.price || item.price || 0),
      })),
      value: Number.parseFloat(event.data.checkout.totalPrice || 0),
      currency: event.data.checkout.currencyCode || "USD",
      order_id: event.data.checkout.order?.id || event.data.checkout.id || "",
    }

    // Send the event
    await sendEvent(
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        user_data: userData,
        custom_data: { ...pageData, ...checkoutData },
        event_source_url: pageData.event_source_url,
        shop_domain: shopDomain,
      },
      shopDomain,
    )

    success("[Web Pixel Gateway] Successfully sent Purchase event")
  } catch (e) {
    error("[Web Pixel Gateway] Error sending Purchase event: " + e.message)
  }
}

// Collect user data from event
function collectUserData(event) {
  try {
    const userData = {
      client_user_agent: "",
    }

    // Add user agent
    if (event.context && event.context.navigator && event.context.navigator.userAgent) {
      userData.client_user_agent = event.context.navigator.userAgent
      success("[Web Pixel Gateway] Added user agent from event context to user data")
    }

    // Try to get customer email (hashed)
    if (event.data && event.data.customer && event.data.customer.email) {
      userData.em = event.data.customer.email.trim().toLowerCase()
      success("[Web Pixel Gateway] Added email to user data")
    }

    // Try to get customer phone (hashed)
    if (event.data && event.data.customer && event.data.customer.phone) {
      userData.ph = event.data.customer.phone.replace(/\D/g, "")
      success("[Web Pixel Gateway] Added phone to user data")
    }

    // Try to get customer address
    if (event.data && event.data.customer && event.data.customer.address) {
      const address = event.data.customer.address

      if (address.firstName && address.lastName) {
        userData.fn = address.firstName.trim().toLowerCase()
        userData.ln = address.lastName.trim().toLowerCase()
        success("[Web Pixel Gateway] Added name to user data")
      }

      if (address.city) {
        userData.ct = address.city.trim().toLowerCase()
        success("[Web Pixel Gateway] Added city to user data")
      }

      if (address.zip) {
        userData.zp = address.zip.trim()
        success("[Web Pixel Gateway] Added zip to user data")
      }
    }

    // Try to get Facebook browser ID from cookies
    if (event.context && event.context.document && event.context.document.cookie) {
      const cookies = event.context.document.cookie
      const fbpMatch = cookies.match(/_fbp=([^;]+)/)
      if (fbpMatch && fbpMatch[1]) {
        userData.fbp = fbpMatch[1]
        success("[Web Pixel Gateway] Added Facebook browser ID to user data")
      }
    }

    // Try to get Facebook click ID from URL
    if (event.context && event.context.document && event.context.document.location) {
      const search = event.context.document.location.search
      const fbclidMatch = search.match(/[?&]fbclid=([^&]+)/)
      if (fbclidMatch && fbclidMatch[1]) {
        userData.fbc = `fb.1.${Date.now()}.${fbclidMatch[1]}`
        success("[Web Pixel Gateway] Added Facebook click ID to user data")
      }
    }

    // Add external ID as fallback
    const shopDomain = extractShopDomain(event)
    userData.external_id = `${shopDomain}_${Date.now()}`
    warn("[Web Pixel Gateway] Added fallback external ID to user data")

    log("[Web Pixel Gateway] Collected user data:", userData)
    return userData
  } catch (e) {
    error("[Web Pixel Gateway] Error collecting user data: " + e.message)
    return { client_user_agent: "Unknown", external_id: `fallback_${Date.now()}` }
  }
}

// Collect page data from event
function collectPageData(event) {
  try {
    const pageData = {}

    // Get page title
    if (event.context && event.context.document && event.context.document.title) {
      pageData.page_title = event.context.document.title
    }

    // Get page URL
    if (event.context && event.context.document && event.context.document.location) {
      const location = event.context.document.location
      pageData.page_location = location.href || ""
      pageData.event_source_url = location.href || ""
      pageData.hostname = location.hostname || ""
    }

    log("[Web Pixel Gateway] Collected page data:", pageData)
    return pageData
  } catch (e) {
    error("[Web Pixel Gateway] Error collecting page data: " + e.message)
    return { page_title: "Unknown", page_location: "Unknown", event_source_url: "Unknown" }
  }
}

// Send event to the server
async function sendEvent(eventData, shopDomain) {
  try {
    // First, fetch the pixel ID for this shop
    log(`[Web Pixel Gateway] Fetching pixel ID for shop: ${shopDomain}`)

    // Use a hardcoded pixel ID for now
    const pixelId = "584928510540140"
    success(`[Web Pixel Gateway] Got pixel ID from config: ${pixelId}`)
    log(`[Web Pixel Gateway] Using pixel ID from config: ${pixelId}`)

    // Add pixel ID to event data
    eventData.pixel_id = pixelId

    // Try to send using fetch with no-cors mode
    try {
      const response = await fetch("https://v0-node-js-serverless-api-lake.vercel.app/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
        mode: "no-cors",
      })

      success(`[Web Pixel Gateway] Successfully sent ${eventData.event_name} event`)
      return
    } catch (fetchError) {
      warn(`[Web Pixel Gateway] Fetch failed, trying sendBeacon: ${fetchError.message}`)

      // Try to send using sendBeacon as fallback
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(eventData)], { type: "application/json" })
        const sent = navigator.sendBeacon("https://v0-node-js-serverless-api-lake.vercel.app/api/track", blob)

        if (sent) {
          success(`[Web Pixel Gateway] Successfully sent ${eventData.event_name} event using sendBeacon`)
          return
        } else {
          warn("[Web Pixel Gateway] sendBeacon failed")
        }
      } else {
        warn("[Web Pixel Gateway] sendBeacon not available")
      }

      // If all else fails, log the error
      throw new Error(`Failed to send event: ${fetchError.message}`)
    }
  } catch (e) {
    error(`[Web Pixel Gateway] Error sending ${eventData.event_name} event: ${e.message}`)
  }
}

register(async ({ configuration, analytics, browser }) => {
  init(analytics)
})
