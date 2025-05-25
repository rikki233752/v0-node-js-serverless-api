// Web Pixel Test Script
// This script checks if the Web Pixel extension is working correctly

;(() => {
  console.log("🔍 [Web Pixel Test] Starting test...")

  // Function to check if Web Pixel is loaded
  function checkWebPixel() {
    // Check if Shopify analytics object exists
    const hasShopifyAnalytics = typeof window.Shopify !== "undefined" && typeof window.Shopify.analytics !== "undefined"

    console.log(`🔍 [Web Pixel Test] Shopify analytics object: ${hasShopifyAnalytics ? "Found" : "Not found"}`)

    // Check for our specific console logs
    const logs = getConsoleLogs()
    const hasOurPixel = logs.some(
      (log) => log.includes("[Web Pixel]") || log.includes("[Simple Pixel") || log.includes("Web Pixel Gateway"),
    )

    console.log(`🔍 [Web Pixel Test] Our pixel logs: ${hasOurPixel ? "Found" : "Not found"}`)

    // Display results
    console.log("🔍 [Web Pixel Test] Test complete")
    console.log(`🔍 [Web Pixel Test] Result: ${hasOurPixel ? "PASS ✅" : "FAIL ❌"}`)
  }

  // Helper function to get console logs (simplified)
  function getConsoleLogs() {
    // This is a simplified version - in reality, we'd need to override console.log
    // before the page loads to capture all logs
    return ["Unable to access previous console logs"]
  }

  // Run the test after a short delay
  setTimeout(checkWebPixel, 1000)
})()
