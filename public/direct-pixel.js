// Direct Facebook Pixel Integration Script
// This script can be added directly to your Shopify theme

;(() => {
  console.log("🚀 [Direct Pixel] Initializing...")

  // Configuration
  const pixelId = "864857281256627" // Your Facebook Pixel ID
  const gatewayUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  // Helper function to send events
  function sendEvent(eventName, customData = {}) {
    try {
      // Create event payload
      const payload = {
        pixelId: pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        user_data: {
          client_user_agent: navigator.userAgent,
        },
        custom_data: {
          source: "direct-pixel-script",
          page_url: window.location.href,
          page_title: document.title,
          ...customData,
        },
      }

      console.log(`📤 [Direct Pixel] Sending ${eventName} event`)

      // Use image beacon method (most reliable)
      const img = new Image()
      img.src = `${gatewayUrl}?d=${encodeURIComponent(JSON.stringify(payload))}&t=${Date.now()}`

      // Also try fetch as backup
      try {
        fetch(gatewayUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "no-cors",
        }).catch((e) => {})
      } catch (fetchError) {
        // Ignore fetch errors
      }
    } catch (error) {
      console.error(`❌ [Direct Pixel] Error sending ${eventName}:`, error)
    }
  }

  // Send PageView event on load
  sendEvent("PageView", { initial_load: true })

  // Listen for add to cart events
  document.addEventListener("click", (event) => {
    // Check if the clicked element is an "Add to Cart" button
    if (event.target.matches('button[name="add"], input[name="add"], .add-to-cart, .product-form__cart-submit')) {
      console.log("🛒 [Direct Pixel] Add to Cart button clicked")
      sendEvent("AddToCart")
    }
  })

  // Track checkout button clicks
  document.addEventListener("click", (event) => {
    if (event.target.matches('.checkout-button, [name="checkout"], .cart__checkout')) {
      console.log("🛍️ [Direct Pixel] Checkout button clicked")
      sendEvent("InitiateCheckout")
    }
  })

  console.log("✅ [Direct Pixel] Initialization complete")
})()
