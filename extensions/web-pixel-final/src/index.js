import { register } from "@shopify/web-pixels-extension"

register(async ({ configuration, analytics, browser }) => {
  // Initialize with debug mode
  const DEBUG = true

  // Set your Vercel app URL here - IMPORTANT: Use your actual Vercel app URL
  const TRACKING_API_URL = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

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

  // Function to get the shop domain from various sources
  function getShopDomain(event) {
    try {
      // Try to get from event context first (most reliable)
      if (event && event.context && event.context.document && event.context.document.location) {
        const hostname = event.context.document.location.hostname
        if (hostname && hostname.includes("myshopify.com")) {
          debugLog(`✅ [Web Pixel Gateway] Detected shop domain from event context: ${hostname}`)
          return hostname
        }
      }

      // Try to get from analytics context if available
      if (analytics && analytics.shopify && analytics.shopify.shop) {
        const domain = analytics.shopify.shop.domain
        if (domain) {
          debugLog(`✅ [Web Pixel Gateway] Using shop domain from analytics context: ${domain}`)
          return domain
        }
      }

      debugLog(`❌ [Web Pixel Gateway] Could not detect shop domain`)
      return null
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error detecting shop domain: ${error.message}`)
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

      // Add browser user agent from event context
      if (event && event.context && event.context.navigator && event.context.navigator.userAgent) {
        userData.client_user_agent = event.context.navigator.userAgent
        debugLog(`✅ [Web Pixel Gateway] Added user agent from event context to user data`)
      }

      // Try to get Facebook click ID from URL parameters
      if (event && event.context && event.context.document && event.context.document.location) {
        const url = event.context.document.location.href
        if (url && url.includes("fbclid=")) {
          const fbclid = url.split("fbclid=")[1].split("&")[0]
          if (fbclid) {
            userData.fbc = `fb.1.${Date.now()}.${fbclid}`
            debugLog(`✅ [Web Pixel Gateway] Added Facebook click ID to user data`)
          }
        }
      }

      // If we still don't have enough user data, add external ID as fallback
      if (!userData.em && !userData.ph && !userData.fbc && !userData.fbp) {
        // Generate a persistent ID based on shop domain and timestamp
        const shopDomain = getShopDomain(event) || "unknown"
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

  // Function to collect page data from event context
  function collectPageData(event) {
    try {
      const pageData = {}

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
      }

      debugLog(`📄 [Web Pixel Gateway] Collected page data:`, pageData)
      return pageData
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error collecting page data: ${error.message}`)
      return {}
    }
  }

  // Function to send event to our tracking API using fetch with no-cors mode
  async function sendEvent(eventName, event, eventData = {}) {
    try {
      const shopDomain = getShopDomain(event)

      if (!shopDomain) {
        debugLog(`❌ [Web Pixel Gateway] Cannot send event: Shop domain not detected`)
        return
      }

      debugLog(`📤 [Web Pixel Gateway] Sending ${eventName} event for shop: ${shopDomain}`)

      // Collect user data
      const userData = collectUserData(event)
      debugLog(`👤 [Web Pixel Gateway] Collected user data:`, userData)

      // Collect page data
      const pageData = collectPageData(event)

      // Prepare custom data
      const customData = {
        ...eventData,
        ...pageData,
      }

      // Prepare the request payload
      const payload = {
        event_name: eventName,
        shop_domain: shopDomain,
        user_data: userData,
        custom_data: customData,
      }

      // Send the event using fetch with no-cors mode
      try {
        const response = await fetch(TRACKING_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          mode: "no-cors", // This is critical for cross-origin requests in Shopify's sandbox
        })

        debugLog(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event`)
        return { success: true }
      } catch (fetchError) {
        debugLog(`❌ [Web Pixel Gateway] Error sending ${eventName} event: ${fetchError.message}`)

        // Try sendBeacon as fallback
        if (navigator && navigator.sendBeacon) {
          try {
            const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
            const success = navigator.sendBeacon(TRACKING_API_URL, blob)

            if (success) {
              debugLog(`✅ [Web Pixel Gateway] Successfully sent ${eventName} event using sendBeacon`)
              return { success: true }
            } else {
              debugLog(`❌ [Web Pixel Gateway] Failed to send ${eventName} event using sendBeacon`)
            }
          } catch (beaconError) {
            debugLog(`❌ [Web Pixel Gateway] Error using sendBeacon: ${beaconError.message}`)
          }
        }

        return { success: false, error: fetchError.message }
      }
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error sending ${eventName} event: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  // Subscribe to page view events
  analytics.subscribe("page_viewed", async (event) => {
    try {
      // Send PageView event
      await sendEvent("PageView", event, {
        content_name: event.context?.document?.title || "Page View",
        content_category: "page_view",
      })
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing page_viewed event: ${error.message}`)
    }
  })

  // Subscribe to product viewed events
  analytics.subscribe("product_viewed", async (event) => {
    try {
      const product = event.data.productVariant

      await sendEvent("ViewContent", event, {
        content_type: "product",
        content_ids: [product.product.id.toString()],
        content_name: product.product.title,
        content_category: product.product.type || "product",
        value: Number.parseFloat(product.price.amount) || 0,
        currency: product.price.currencyCode,
      })
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing product_viewed event: ${error.message}`)
    }
  })

  // Subscribe to collection viewed events
  analytics.subscribe("collection_viewed", async (event) => {
    try {
      const collection = event.data.collection

      await sendEvent("ViewContent", event, {
        content_type: "collection",
        content_name: collection.title,
        content_category: "collection",
      })
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing collection_viewed event: ${error.message}`)
    }
  })

  // Subscribe to search submitted events
  analytics.subscribe("search_submitted", async (event) => {
    try {
      const searchData = event.data

      await sendEvent("Search", event, {
        search_string: searchData.searchResult.query,
        content_category: "search",
      })
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

      await sendEvent("ViewCart", event, {
        content_type: "product",
        content_ids: contentIds,
        value: value,
        currency: cart.cost.totalAmount.currencyCode,
        num_items: cartItems.length,
      })
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

      await sendEvent("InitiateCheckout", event, {
        content_type: "product",
        content_ids: contentIds,
        value: value,
        currency: checkout.totalPrice.currencyCode,
        num_items: checkoutItems.length,
      })
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

      await sendEvent("Purchase", event, {
        content_type: "product",
        content_ids: contentIds,
        value: value,
        currency: checkout.totalPrice.currencyCode,
        num_items: checkoutItems.length,
        order_id: checkout.order?.id || checkout.id,
      })
    } catch (error) {
      debugLog(`❌ [Web Pixel Gateway] Error processing checkout_completed event: ${error.message}`)
    }
  })
})
