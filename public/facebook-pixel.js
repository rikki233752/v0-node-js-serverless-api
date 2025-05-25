// Direct Facebook Pixel Implementation
;(() => {
  console.log("🚀 [Direct FB Pixel] Script loaded")

  // Configuration
  const PIXEL_ID = "584928510540140" // Default test pixel ID
  const API_URL = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  console.log(`🎯 [Direct FB Pixel] Using pixel ID: ${PIXEL_ID}`)
  console.log(`🔗 [Direct FB Pixel] Using API URL: ${API_URL}`)

  // Helper function to get shop domain
  function getShopDomain() {
    try {
      return window.location.hostname
    } catch (e) {
      console.error("❌ [Direct FB Pixel] Error getting shop domain:", e)
      return "unknown"
    }
  }

  // Send event to our API
  function sendEvent(eventName, eventData = {}) {
    try {
      console.log(`📤 [Direct FB Pixel] Sending event: ${eventName}`)

      const payload = {
        pixelId: PIXEL_ID,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        user_data: {
          client_user_agent: navigator.userAgent,
        },
        custom_data: {
          ...eventData,
          page_url: window.location.href,
          shop: getShopDomain(),
        },
      }

      // Use image pixel method to avoid CORS issues
      const img = new Image(1, 1)
      img.src = `${API_URL}?d=${encodeURIComponent(JSON.stringify(payload))}`

      console.log(`✅ [Direct FB Pixel] Event sent: ${eventName}`)
    } catch (err) {
      console.error(`❌ [Direct FB Pixel] Error sending event: ${err.message}`)
    }
  }

  // Track page view on load
  sendEvent("PageView", { source: "direct_script" })

  // Track add to cart events
  document.addEventListener("click", (e) => {
    try {
      // Check if the clicked element is an add to cart button
      if (
        e.target.matches('button[name="add"], input[name="add"], .add-to-cart, .product-form__cart-submit') ||
        e.target.closest('button[name="add"], input[name="add"], .add-to-cart, .product-form__cart-submit')
      ) {
        console.log("🛒 [Direct FB Pixel] Add to cart button clicked")

        // Get product information if available
        let productData = {}

        // Try to get product data from the page
        try {
          if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
            const product = window.ShopifyAnalytics.meta.product
            productData = {
              content_ids: [product.id.toString()],
              content_name: product.title,
              content_type: "product",
              value: Number.parseFloat(product.price / 100).toFixed(2),
              currency: window.Shopify ? window.Shopify.currency.active : "USD",
            }
          }
        } catch (err) {
          console.warn("⚠️ [Direct FB Pixel] Could not get product data:", err.message)
        }

        sendEvent("AddToCart", productData)
      }
    } catch (err) {
      console.error("❌ [Direct FB Pixel] Error in click handler:", err.message)
    }
  })

  // Track checkout events
  if (window.location.pathname.includes("/checkout")) {
    console.log("🛍️ [Direct FB Pixel] Checkout page detected")
    sendEvent("InitiateCheckout", { source: "checkout_page" })
  }

  console.log("✅ [Direct FB Pixel] Initialization complete")
})()
