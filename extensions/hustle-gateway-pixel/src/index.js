// Hustle Gateway Pixel - Meta Conversions API Gateway Integration
import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  // Get settings
  const { settings } = configuration
  const pixelId = settings.pixelId
  const gatewayUrl = settings.gatewayUrl || "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
  const debug = settings.debug || false

  // Debug logging function
  const log = (message, data) => {
    if (debug) {
      console.log(`Hustle Gateway Pixel: ${message}`, data)
    }
  }

  log("Initialized with settings", { pixelId, gatewayUrl })

  // Helper function to get cookies
  const getCookies = () => {
    const cookies = {
      fbp: null,
      fbc: null,
    }

    try {
      // Get _fbp cookie
      const fbpMatch = document.cookie.match(/_fbp=([^;]+)/)
      if (fbpMatch) cookies.fbp = fbpMatch[1]

      // Get _fbc cookie
      const fbcMatch = document.cookie.match(/_fbc=([^;]+)/)
      if (fbcMatch) cookies.fbc = fbcMatch[1]
    } catch (e) {
      log("Error getting cookies", e)
    }

    return cookies
  }

  // Helper function to send event to Meta Conversions API Gateway
  const sendToGateway = (eventName, customData = {}) => {
    try {
      // Get cookies
      const cookies = getCookies()

      // Prepare user data
      const userData = {
        client_user_agent: navigator.userAgent,
        fbp: cookies.fbp,
        fbc: cookies.fbc,
      }

      // Prepare event data
      const eventData = {
        pixelId: pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: window.location.href,
        user_data: userData,
        custom_data: customData,
      }

      log(`Sending ${eventName} event`, eventData)

      // Send using image beacon to avoid CORS issues
      const img = new Image()
      img.src = `${gatewayUrl}?d=${encodeURIComponent(JSON.stringify(eventData))}&t=${new Date().getTime()}`
    } catch (e) {
      log("Error sending event", e)
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
  }

  // Subscribe to all Shopify events
  analytics.subscribe("all_events", (event) => {
    const { name, data } = event
    log(`Received Shopify event: ${name}`, data)

    // Map to Facebook event name
    const fbEventName = eventMapping[name] || name

    // Process event-specific data
    let customData = {}

    switch (name) {
      case "page_viewed":
        customData = {
          page_title: document.title,
          page_location: window.location.href,
          page_path: window.location.pathname,
        }
        break

      case "product_viewed":
        if (data.productVariant) {
          const product = data.productVariant
          customData = {
            content_type: "product",
            content_ids: [product.id || product.sku || product.product_id],
            content_name: product.title || product.name,
            content_category: product.product_type,
            value: Number.parseFloat(product.price?.amount) || 0,
            currency: product.price?.currencyCode || "USD",
          }
        }
        break

      case "product_added_to_cart":
        if (data.cartLine) {
          const product = data.cartLine
          customData = {
            content_type: "product",
            content_ids: [product.merchandise?.id || product.merchandise?.sku],
            content_name: product.merchandise?.title || product.merchandise?.name,
            value: Number.parseFloat(product.cost?.totalAmount?.amount) || 0,
            currency: product.cost?.totalAmount?.currencyCode || "USD",
            num_items: product.quantity || 1,
          }
        }
        break

      case "cart_viewed":
        if (data.cart) {
          const cart = data.cart
          const contentIds = cart.lines?.map((line) => line.merchandise?.id || line.merchandise?.sku) || []
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
          const contentIds = checkout.lineItems?.map((item) => item.variant?.id || item.variant?.sku) || []
          customData = {
            content_type: "product",
            content_ids: contentIds,
            value: Number.parseFloat(checkout.totalPrice?.amount) || 0,
            currency: checkout.totalPrice?.currencyCode || "USD",
            num_items: checkout.lineItems?.reduce((total, item) => total + (item.quantity || 0), 0) || 0,
          }
        }
        break

      case "checkout_completed":
        if (data.checkout) {
          const checkout = data.checkout
          const contentIds = checkout.lineItems?.map((item) => item.variant?.id || item.variant?.sku) || []
          customData = {
            content_type: "product",
            content_ids: contentIds,
            value: Number.parseFloat(checkout.totalPrice?.amount) || 0,
            currency: checkout.totalPrice?.currencyCode || "USD",
            num_items: checkout.lineItems?.reduce((total, item) => total + (item.quantity || 0), 0) || 0,
            order_id: checkout.order?.id || checkout.id,
          }
        }
        break

      default:
        // For other events, include all data as custom data
        customData = { ...data }
    }

    // Send event to gateway
    sendToGateway(fbEventName, customData)
  })

  // Send PageView event on initialization
  sendToGateway("PageView", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname,
  })

  log("Extension fully initialized")
})
