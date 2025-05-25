// Web Pixel Extension v191 (based on v133)
// This version is a direct copy of the working v133 code

import { register } from "@shopify/web-pixels-extension"

register(({ configuration, analytics, browser }) => {
  // Get settings from Shopify admin
  const { settings } = configuration || {}
  const pixelId = settings?.pixelId || "864857281256627"
  const gatewayUrl = settings?.gatewayUrl || "https://v0-node-js-serverless-api-lake.vercel.app/api/track"
  const debug = settings?.debug || false
  const accountID = settings?.accountID || ""

  // Debug logging function
  const log = (message, data) => {
    if (debug) {
      console.log(`[Hustle Gateway Pixel] ${message}`, data)
    }
  }

  log("Extension initialized", {
    pixelId,
    gatewayUrl,
    debug,
    accountID,
    timestamp: new Date().toISOString(),
  })

  // Helper function to safely get cookies
  const getCookies = () => {
    const cookies = {
      fbp: null,
      fbc: null,
    }

    try {
      if (typeof document !== "undefined" && document.cookie) {
        // Get _fbp cookie (Facebook browser ID)
        const fbpMatch = document.cookie.match(/_fbp=([^;]+)/)
        if (fbpMatch) cookies.fbp = fbpMatch[1]

        // Get _fbc cookie (Facebook click ID)
        const fbcMatch = document.cookie.match(/_fbc=([^;]+)/)
        if (fbcMatch) cookies.fbc = fbcMatch[1]
      }
    } catch (e) {
      log("Error reading cookies", e)
    }

    return cookies
  }

  // Helper function to get client information
  const getClientInfo = () => {
    try {
      return {
        user_agent: navigator?.userAgent || "Unknown",
        language: navigator?.language || "en",
        screen_resolution: screen ? `${screen.width}x${screen.height}` : "unknown",
        url: window?.location?.href || "unknown",
        referrer: document?.referrer || "",
        timestamp: new Date().toISOString(),
      }
    } catch (e) {
      log("Error getting client info", e)
      return {
        user_agent: "Unknown",
        language: "en",
        screen_resolution: "unknown",
        url: "unknown",
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
        pixelId: pixelId,
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

      log(`Sending ${eventName} event to gateway`, eventData)

      // Send using image beacon method for maximum compatibility
      const img = new Image()
      const queryString = `d=${encodeURIComponent(JSON.stringify(eventData))}&t=${Date.now()}`

      img.onload = () => {
        log(`Successfully sent ${eventName} event`, { event_id: eventData.event_time })
      }

      img.onerror = (error) => {
        log(`Failed to send ${eventName} event`, { error, eventData })
      }

      // Set the image source to trigger the request
      img.src = `${gatewayUrl}?${queryString}`

      // Also try fetch as backup (if supported and not blocked by CORS)
      if (typeof fetch !== "undefined") {
        fetch(gatewayUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
          mode: "no-cors", // Avoid CORS issues
        }).catch((error) => {
          log(`Fetch backup failed for ${eventName}`, error)
        })
      }
    } catch (error) {
      log(`Error sending ${eventName} event`, error)
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

  // Subscribe to all Shopify Customer Events
  analytics.subscribe("all_events", (event) => {
    try {
      const { name, data } = event
      log(`Received Shopify event: ${name}`, { name, data })

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
      log(`Error processing event ${event.name}`, error)
    }
  })

  // Send initial PageView event
  try {
    const clientInfo = getClientInfo()
    sendToGateway("PageView", {
      page_title: clientInfo.url.includes("?") ? clientInfo.url.split("?")[0] : clientInfo.url,
      page_location: clientInfo.url,
      page_path: new URL(clientInfo.url).pathname,
      initial_load: true,
    })
  } catch (error) {
    log("Error sending initial PageView", error)
  }

  log("Extension fully initialized and ready to track events")
})
