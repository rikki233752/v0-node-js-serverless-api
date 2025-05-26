import { register } from "@shopify/web-pixels-extension"

register(async ({ configuration, analytics, browser }) => {
  // Initialize with debug mode
  const DEBUG = true

  // Log initialization
  console.log("🎉 [Web Pixel Gateway] Extension fully initialized!")

  // Function to safely log debug messages
  function debugLog(message, data = {}) {
    if (DEBUG) {
      try {
        console.log(message, data)
      } catch (e) {
        // Ignore logging errors
      }
    }
  }

  // Function to safely get shop domain from event context
  function getShopDomainFromEvent(event) {
    try {
      // Try to get from event context first
      if (event && event.context && event.context.document && event.context.document.location) {
        const hostname = event.context.document.location.hostname
        if (hostname && hostname.includes("myshopify.com")) {
          debugLog(`✅ [Web Pixel Gateway] Extracted shop domain from event context: ${hostname}`)
          return hostname
        }
      }

      // Fallback to analytics context if available
      if (analytics && analytics.shopify && analytics.shopify.shop) {
        const domain = analytics.shopify.shop.domain
        if (domain) {
          debugLog(`✅ [Web Pixel Gateway] Using shop domain from analytics context: ${domain}`)
          return domain
        }
      }

      debugLog(`❌ [Web Pixel Gateway] Could not detect shop domain from event`)
      return null
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error detecting shop domain from event: ${error.message}`)
      return null
    }
  }

  // Function to collect user data from various sources
  function collectUserData(event) {
    const userData = {}

    try {
      // Try to get customer info from Shopify context
      if (analytics && analytics.shopify && analytics.shopify.customer) {
        const customer = analytics.shopify.customer

        // Add email if available (high value for matching)
        if (customer.email) {
          userData.em = customer.email
          debugLog(`✅ [Web Pixel Gateway] Added customer email to user data`)
        }

        // Add phone if available
        if (customer.phone) {
          userData.ph = customer.phone
          debugLog(`✅ [Web Pixel Gateway] Added customer phone to user data`)
        }

        // Add name if available
        if (customer.firstName) {
          userData.fn = customer.firstName
          debugLog(`✅ [Web Pixel Gateway] Added customer first name to user data`)
        }

        if (customer.lastName) {
          userData.ln = customer.lastName
          debugLog(`✅ [Web Pixel Gateway] Added customer last name to user data`)
        }

        // Add address info if available
        if (customer.defaultAddress) {
          const address = customer.defaultAddress

          if (address.city) {
            userData.ct = address.city
            debugLog(`✅ [Web Pixel Gateway] Added customer city to user data`)
          }

          if (address.zip) {
            userData.zp = address.zip
            debugLog(`✅ [Web Pixel Gateway] Added customer zip to user data`)
          }

          if (address.countryCode) {
            userData.country = address.countryCode
            debugLog(`✅ [Web Pixel Gateway] Added customer country to user data`)
          }
        }
      }

      // Try to get user agent from event context
      if (event && event.context && event.context.navigator && event.context.navigator.userAgent) {
        userData.client_user_agent = event.context.navigator.userAgent
        debugLog(`✅ [Web Pixel Gateway] Added user agent from event context to user data`)
      }

      // Try to get Facebook click ID from URL parameters in event context
      if (event && event.context && event.context.document && event.context.document.location) {
        const search = event.context.document.location.search
        if (search && search.includes("fbclid=")) {
          // Simple parsing without URLSearchParams which might not be available
          const fbclidMatch = search.match(/fbclid=([^&]+)/)
          if (fbclidMatch && fbclidMatch[1]) {
            userData.fbc = `fb.1.${Date.now()}.${fbclidMatch[1]}`
            debugLog(`✅ [Web Pixel Gateway] Added Facebook click ID to user data`)
          }
        }
      }

      // If we still don't have enough user data, add external ID as fallback
      if (!userData.em && !userData.ph && !userData.fbc && !userData.fbp) {
        // Generate a persistent ID based on shop domain and timestamp
        const shopDomain = getShopDomainFromEvent(event) || "unknown"
        const timestamp = Date.now()
        userData.external_id = `${shopDomain}_${timestamp}`
        debugLog(`⚠️ [Web Pixel Gateway] Added fallback external ID to user data`)
      }

      return userData
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error collecting user data: ${error.message}`)
      return {
        external_id: `fallback_${Date.now()}`,
      }
    }
  }

  // Function to safely get page data from event context
  function getPageDataFromEvent(event) {
    const pageData = {}

    try {
      if (event && event.context && event.context.document) {
        const doc = event.context.document

        if (doc.title) {
          pageData.page_title = doc.title
        }

        if (doc.location) {
          if (doc.location.href) {
            pageData.page_location = doc.location.href
            pageData.event_source_url = doc.location.href
          }

          if (doc.location.hostname) {
            pageData.hostname = doc.location.hostname
          }
        }

        if (doc.referrer) {
          pageData.page_referrer = doc.referrer
        }
      }

      return pageData
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error getting page data: ${error.message}`)
      return {}
    }
  }

  // Function to send event to our tracking API
  async function sendEvent(eventName, eventData = {}, event) {
    try {
      const shopDomain = getShopDomainFromEvent(event)

      if (!shopDomain) {
        debugLog(`❌ [Web Pixel Gateway] Cannot send event: Shop domain not detected`)
        return
      }

      debugLog(`📤 [Web Pixel Gateway] Sending ${eventName} event for shop: ${shopDomain}`)

      // Collect user data
      const userData = collectUserData(event)
      debugLog(`👤 [Web Pixel Gateway] Collected user data:`, userData)

      // Get page data
      const pageData = getPageDataFromEvent(event)
      debugLog(`📄 [Web Pixel Gateway] Collected page data:`, pageData)

      // Prepare custom data
      const customData = {
        ...eventData,
        ...pageData,
      }

      // Send the event to our tracking API
      const response = await fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_name: eventName,
          shop_domain: shopDomain,
          user_data: userData,
          custom_data: customData,
        }),
      })

      const result = await response.json()

      if (result.success) {
        debugLog(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event`)
      } else {
        debugLog(`❌ [Web Pixel Gateway] Error sending ${eventName} event: ${result.error}`)
      }

      return result
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error sending ${eventName} event: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  // Subscribe to page view events
  analytics.subscribe("page_viewed", async (event) => {
    try {
      // Send PageView event
      await sendEvent(
        "PageView",
        {
          content_name: event.context?.document?.title || "Page View",
          content_category: "page_view",
        },
        event,
      )
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing page_viewed event: ${error.message}`)
    }
  })

  // Subscribe to product viewed events
  analytics.subscribe("product_viewed", async (event) => {
    try {
      const product = event.data.productVariant

      await sendEvent(
        "ViewContent",
        {
          content_type: "product",
          content_ids: [product.product.id.toString()],
          content_name: product.product.title,
          content_category: product.product.type || "product",
          value: Number.parseFloat(product.price.amount) || 0,
          currency: product.price.currencyCode,
        },
        event,
      )
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing product_viewed event: ${error.message}`)
    }
  })

  // Subscribe to collection viewed events
  analytics.subscribe("collection_viewed", async (event) => {
    try {
      const collection = event.data.collection

      await sendEvent(
        "ViewContent",
        {
          content_type: "collection",
          content_name: collection.title,
          content_category: "collection",
        },
        event,
      )
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing collection_viewed event: ${error.message}`)
    }
  })

  // Subscribe to search submitted events
  analytics.subscribe("search_submitted", async (event) => {
    try {
      const searchData = event.data

      await sendEvent(
        "Search",
        {
          search_string: searchData.searchResult.query,
          content_category: "search",
        },
        event,
      )
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing search_submitted event: ${error.message}`)
    }
  })

  // Subscribe to cart events
  analytics.subscribe("cart_viewed", async (event) => {
    try {
      const cart = event.data.cart
      const cartItems = cart.lines || []

      const contentIds = cartItems.map((item) => item.merchandise.product.id.toString())
      const value = Number.parseFloat(cart.cost.totalAmount.amount) || 0

      await sendEvent(
        "ViewCart",
        {
          content_type: "product",
          content_ids: contentIds,
          value: value,
          currency: cart.cost.totalAmount.currencyCode,
          num_items: cartItems.length,
        },
        event,
      )
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing cart_viewed event: ${error.message}`)
    }
  })

  // Subscribe to checkout events
  analytics.subscribe("checkout_started", async (event) => {
    try {
      const checkout = event.data.checkout
      const checkoutItems = checkout.lineItems || []

      const contentIds = checkoutItems.map((item) => item.variant.product.id.toString())
      const value = Number.parseFloat(checkout.totalPrice.amount) || 0

      await sendEvent(
        "InitiateCheckout",
        {
          content_type: "product",
          content_ids: contentIds,
          value: value,
          currency: checkout.totalPrice.currencyCode,
          num_items: checkoutItems.length,
        },
        event,
      )
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing checkout_started event: ${error.message}`)
    }
  })

  // Subscribe to purchase events
  analytics.subscribe("checkout_completed", async (event) => {
    try {
      const checkout = event.data.checkout
      const checkoutItems = checkout.lineItems || []

      const contentIds = checkoutItems.map((item) => item.variant.product.id.toString())
      const value = Number.parseFloat(checkout.totalPrice.amount) || 0

      await sendEvent(
        "Purchase",
        {
          content_type: "product",
          content_ids: contentIds,
          value: value,
          currency: checkout.totalPrice.currencyCode,
          num_items: checkoutItems.length,
          order_id: checkout.order?.id || checkout.id,
        },
        event,
      )
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing checkout_completed event: ${error.message}`)
    }
  })
})
