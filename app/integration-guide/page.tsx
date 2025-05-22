"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"

export default function IntegrationGuidePage() {
  const [gatewayUrl, setGatewayUrl] = useState("")

  useEffect(() => {
    // Get the current hostname
    const host = window.location.hostname
    const protocol = window.location.protocol

    // Set the gateway URL
    if (host.includes("localhost")) {
      setGatewayUrl(`${protocol}//${host}:${window.location.port}/api/track`)
    } else {
      setGatewayUrl(`${protocol}//${host}/api/track`)
    }
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Integration Guide</h1>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>

      <Tabs defaultValue="client">
        <TabsList className="mb-4">
          <TabsTrigger value="client">Client-Side Implementation</TabsTrigger>
          <TabsTrigger value="server">Server-Side Implementation</TabsTrigger>
          <TabsTrigger value="shopify">Shopify Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="client">
          <Card>
            <CardHeader>
              <CardTitle>Client-Side Implementation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Add this code to your website <strong>after</strong> your existing Facebook Pixel code to automatically
                forward all events to the server-side gateway:
              </p>

              <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
                <pre className="text-sm">
                  {`<script>
// Facebook Pixel Server-Side Gateway
!((w, d) => {
  // Store the original fbq function
  var originalFbq = w.fbq

  // Only proceed if fbq exists (Facebook Pixel is installed)
  if (typeof originalFbq !== "function") return

  // Your gateway URL - replace with your actual deployment URL
  var gatewayUrl = "${gatewayUrl}"

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
</script>`}
                </pre>
              </div>

              <h3 className="text-lg font-semibold mb-2">How It Works</h3>
              <p className="mb-4">
                This script intercepts all Facebook Pixel events and sends them to both the browser-based Facebook Pixel
                and our server-side gateway. The gateway then forwards the events to Facebook's Conversions API.
              </p>

              <h3 className="text-lg font-semibold mb-2">Testing</h3>
              <p>
                After adding the script, you can use our{" "}
                <Link href="/test-pixel" className="text-blue-600 hover:underline">
                  Test Pixel Tool
                </Link>{" "}
                to verify that events are being sent correctly.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server">
          <Card>
            <CardHeader>
              <CardTitle>Server-Side Implementation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                You can also send events directly to our gateway from your server. This is useful for tracking
                server-side events like order confirmations.
              </p>

              <h3 className="text-lg font-semibold mb-2">API Endpoint</h3>
              <p className="mb-2">Send a POST request to:</p>
              <div className="bg-gray-100 p-3 rounded mb-4">
                <code>{gatewayUrl}</code>
              </div>

              <h3 className="text-lg font-semibold mb-2">Request Format</h3>
              <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
                <pre className="text-sm">
                  {`{
  "pixelId": "YOUR_PIXEL_ID",
  "event_name": "Purchase",
  "event_time": 1621234567,  // Unix timestamp
  "user_data": {
    "em": "user@example.com",  // Will be hashed on the server
    "ph": "1234567890",        // Will be hashed on the server
    "client_user_agent": "Mozilla/5.0...",
    "client_ip_address": "192.168.1.1"  // Optional
  },
  "custom_data": {
    "currency": "USD",
    "value": 123.45,
    "content_ids": ["product-123"],
    "content_type": "product"
  }
}`}
                </pre>
              </div>

              <h3 className="text-lg font-semibold mb-2">Example (Node.js)</h3>
              <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-6">
                <pre className="text-sm">
                  {`const fetch = require('node-fetch');

async function sendEvent() {
  const response = await fetch('${gatewayUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pixelId: 'YOUR_PIXEL_ID',
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      user_data: {
        em: 'user@example.com',
        ph: '1234567890',
        client_user_agent: 'Server-Side Event'
      },
      custom_data: {
        currency: 'USD',
        value: 123.45,
        content_ids: ['product-123'],
        content_type: 'product'
      }
    })
  });

  const data = await response.json();
  console.log(data);
}

sendEvent();`}
                </pre>
              </div>

              <p>
                For more information, see our{" "}
                <Link href="/api-docs" className="text-blue-600 hover:underline">
                  API Documentation
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shopify">
          <Card>
            <CardHeader>
              <CardTitle>Shopify Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Our app includes a Shopify Web Pixel Extension that automatically tracks all standard Shopify events and
                sends them to Facebook's Conversions API.
              </p>

              <h3 className="text-lg font-semibold mb-2">Installation</h3>
              <p className="mb-4">
                The Web Pixel Extension is automatically installed when you install our app. No additional configuration
                is required.
              </p>

              <h3 className="text-lg font-semibold mb-2">Tracked Events</h3>
              <p className="mb-2">The following Shopify events are automatically tracked:</p>
              <ul className="list-disc pl-5 mb-4 space-y-1">
                <li>Page View</li>
                <li>Product View</li>
                <li>Collection View</li>
                <li>Search</li>
                <li>Add to Cart</li>
                <li>View Cart</li>
                <li>Checkout Start</li>
                <li>Checkout Address Info Submitted</li>
                <li>Checkout Payment Info Submitted</li>
                <li>Purchase</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2">Configuration</h3>
              <p className="mb-4">
                To configure the Web Pixel Extension, go to the{" "}
                <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
                  Admin Dashboard
                </Link>{" "}
                and add your Facebook Pixel ID and Access Token.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Note</h4>
                <p className="text-blue-800">
                  If you're already using the Facebook Pixel in your Shopify store, our app will work alongside it. You
                  don't need to remove your existing Facebook Pixel.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
