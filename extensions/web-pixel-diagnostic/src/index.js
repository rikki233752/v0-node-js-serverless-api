// Web Pixel Diagnostic - Explores what's available in the environment
import { register } from "@shopify/web-pixels-extension"

register((api) => {
  console.log("🔍 Web Pixel Diagnostic Extension loaded")

  // Log the entire API object
  console.log("📦 Full API object:", api)

  // Check what's available in the API
  console.log("🔧 API keys:", Object.keys(api))

  // Check analytics object
  if (api.analytics) {
    console.log("📊 Analytics available")
    console.log("📊 Analytics methods:", Object.keys(api.analytics))
    console.log("📊 Analytics object:", api.analytics)
  } else {
    console.log("❌ Analytics not available")
  }

  // Check browser object
  if (api.browser) {
    console.log("🌐 Browser available")
    console.log("🌐 Browser methods:", Object.keys(api.browser))
    console.log("🌐 Browser object:", api.browser)

    // Check specific browser methods
    if (api.browser.sendBeacon) {
      console.log("✅ browser.sendBeacon available")
    }
    if (api.browser.cookie) {
      console.log("✅ browser.cookie available")
    }
    if (api.browser.localStorage) {
      console.log("✅ browser.localStorage available")
    }
    if (api.browser.sessionStorage) {
      console.log("✅ browser.sessionStorage available")
    }
  } else {
    console.log("❌ Browser not available")
  }

  // Check init object
  if (api.init) {
    console.log("🚀 Init available")
    console.log("🚀 Init data:", api.init)
  } else {
    console.log("❌ Init not available")
  }

  // Check settings object
  if (api.settings) {
    console.log("⚙️ Settings available")
    console.log("⚙️ Settings data:", api.settings)
  } else {
    console.log("❌ Settings not available")
  }

  // Try to find any method that can send data
  console.log("🔍 Searching for communication methods...")

  // Try browser.sendBeacon if available
  if (api.browser && api.browser.sendBeacon) {
    console.log("🚀 Attempting to use browser.sendBeacon...")
    try {
      const testData = JSON.stringify({
        test: true,
        timestamp: Date.now(),
        source: "web-pixel-diagnostic",
      })

      const success = api.browser.sendBeacon(
        "https://v0-node-js-serverless-api-lake.vercel.app/api/track/beacon",
        testData,
      )

      console.log("📤 sendBeacon result:", success)
    } catch (error) {
      console.error("❌ sendBeacon error:", error)
    }
  }

  // Subscribe to events to see what data we get
  if (api.analytics && api.analytics.subscribe) {
    console.log("📡 Subscribing to events...")

    api.analytics.subscribe("all_events", (event) => {
      console.log("📨 Event received:", event)
      console.log("📨 Event name:", event.name)
      console.log("📨 Event data:", event.data)
      console.log("📨 Event context:", event.context)

      // Try to send via sendBeacon if available
      if (api.browser && api.browser.sendBeacon) {
        try {
          const eventData = JSON.stringify({
            event_name: event.name,
            event_data: event.data,
            timestamp: Date.now(),
            source: "web-pixel-diagnostic",
          })

          const success = api.browser.sendBeacon(
            "https://v0-node-js-serverless-api-lake.vercel.app/api/track/beacon",
            eventData,
          )

          console.log(`📤 Event ${event.name} sent via sendBeacon:`, success)
        } catch (error) {
          console.error(`❌ Error sending ${event.name}:`, error)
        }
      }
    })
  } else {
    console.log("❌ Cannot subscribe to events")
  }

  console.log("✅ Web Pixel Diagnostic Extension initialized")
})
