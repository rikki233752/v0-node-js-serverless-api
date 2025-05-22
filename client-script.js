// Facebook Pixel Server-Side Gateway
!((w, d) => {
  // Store the original fbq function
  var originalFbq = w.fbq

  // Only proceed if fbq exists (Facebook Pixel is installed)
  if (typeof originalFbq !== "function") return

  // Your gateway URL - replace with your actual deployment URL
  var gatewayUrl = "https://v0-node-js-serverless-7m8xtlbnv-blinkdigital.vercel.app/api/track"

  // Get all pixel IDs from the existing Facebook Pixel
  var getPixelIds = () => {
    var pixelIds = []
    if (w.fbq && w.fbq.instance && w.fbq.instance.pixelsByID) {
      pixelIds = Object.keys(w.fbq.instance.pixelsByID)
    }
    return pixelIds
  }

  // Get basic user data including fbp and fbc cookies
  var getUserData = () => {
    var userData = {
      client_user_agent: navigator.userAgent,
    }

    try {
      var cookies = d.cookie.split(";")
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].trim()
        if (cookie.indexOf("_fbp=") === 0) {
          userData.fbp = cookie.substring(5)
        } else if (cookie.indexOf("_fbc=") === 0) {
          userData.fbc = cookie.substring(5)
        }
      }
    } catch (e) {
      // Ignore cookie reading errors
    }

    return userData
  }

  // Override the fbq function to intercept events
  w.fbq = function () {
    // Call the original fbq function
    originalFbq.apply(this, arguments)

    // Process the arguments
    var args = Array.prototype.slice.call(arguments)

    // Only process track events
    if (args[0] === "track") {
      var eventName = args[1]
      var params = args[2] || {}
      var pixelIds = getPixelIds()

      // Skip if no pixel IDs found
      if (pixelIds.length === 0) return

      // Get user data once to reuse for all pixels
      var userData = getUserData()

      // Process for each pixel ID
      pixelIds.forEach((pixelId) => {
        // Prepare data for the server-side gateway
        var data = {
          pixelId: pixelId,
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          user_data: JSON.parse(JSON.stringify(userData)), // Clone to avoid reference issues
          custom_data: {},
        }

        // Copy custom data
        for (var key in params) {
          if (params.hasOwnProperty(key)) {
            // Check if this is user data that should be hashed
            if (["em", "ph", "fn", "ln", "ct", "st", "zp", "country"].indexOf(key) !== -1) {
              data.user_data[key] = params[key]
            } else {
              data.custom_data[key] = params[key]
            }
          }
        }

        // Use a simple image pixel as fallback for CORS issues
        var img = new Image()
        img.src = gatewayUrl + "?d=" + encodeURIComponent(JSON.stringify(data)) + "&t=" + new Date().getTime()
      })
    }
  }

  // Copy all properties from the original fbq
  for (var prop in originalFbq) {
    if (originalFbq.hasOwnProperty(prop)) {
      w.fbq[prop] = originalFbq[prop]
    }
  }
})(window, document)
