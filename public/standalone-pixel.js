// Standalone Facebook Pixel Script
// This can be added directly to your Shopify theme

;(() => {
  console.log("Standalone Facebook Pixel Script loaded")

  // Configuration
  var pixelId = "864857281256627"
  var apiUrl = "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

  // Helper function to send events
  function sendEvent(eventName, data) {
    data = data || {}

    try {
      // Create payload
      var payload = {
        pixelId: pixelId,
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        custom_data: {
          page_url: window.location.href,
          page_title: document.title,
          standalone_script: true,
          ...data,
        },
      }

      // Use image beacon method (works everywhere)
      var img = new Image()
      img.src = apiUrl + "?d=" + encodeURIComponent(JSON.stringify(payload)) + "&t=" + Date.now()

      console.log("Event sent: " + eventName)
    } catch (error) {
      console.error("Error sending event:", error)
    }
  }

  // Send PageView on load
  sendEvent("PageView", { initial_load: true })

  // Track Add to Cart clicks
  document.addEventListener("click", (event) => {
    if (event.target.matches('button[name="add"], input[name="add"], .add-to-cart')) {
      console.log("Add to Cart button clicked")
      sendEvent("AddToCart")
    }
  })

  console.log("Standalone Facebook Pixel Script initialized")
})()
