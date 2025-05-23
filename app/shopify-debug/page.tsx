"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Send } from "lucide-react"

export default function ShopifyDebug() {
  const [shopDomain, setShopDomain] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [gatewayUrl, setGatewayUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Move window access to useEffect to avoid SSR issues
  useEffect(() => {
    // Get the current hostname for default gateway URL
    const host = window.location.hostname
    const protocol = window.location.protocol
    if (host.includes("localhost")) {
      setGatewayUrl(`${protocol}//${host}:${window.location.port}/api/track`)
    } else {
      setGatewayUrl(`${protocol}//${host}/api/track`)
    }
  }, [])

  const testShopifyConnection = async () => {
    if (!shopDomain || !pixelId) {
      setError("Please enter both Shopify domain and Pixel ID")
      return
    }

    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      // Format shop domain
      let formattedShop = shopDomain.trim().toLowerCase()
      formattedShop = formattedShop.replace(/^https?:\/\//, "")
      formattedShop = formattedShop.replace(/\/$/, "")
      if (!formattedShop.includes(".myshopify.com")) {
        formattedShop = `${formattedShop}.myshopify.com`
      }

      // Create test event data
      const testEvent = {
        pixelId: pixelId,
        event_name: "ShopifyDebugTest",
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: `https://${formattedShop}`,
        user_data: {
          client_user_agent: navigator.userAgent,
          client_ip_address: "127.0.0.1",
        },
        custom_data: {
          test_source: "shopify_debug_tool",
          shop_domain: formattedShop,
          gateway_url: gatewayUrl,
          timestamp: new Date().toISOString(),
        },
      }

      // Send test event to gateway
      const response = await fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testEvent),
      })

      const data = await response.json()

      // Generate debug instructions
      const debugInstructions = {
        shopifySetup: {
          extensionSettings: {
            pixelId: pixelId,
            gatewayUrl: gatewayUrl,
            debug: true,
          },
          testCode: `
// Add this to your theme.liquid before </body> to test gateway connection
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Create test event
    var testEvent = {
      pixelId: "${pixelId}",
      event_name: "ShopifyManualTest",
      event_time: Math.floor(Date.now() / 1000),
      user_data: {
        client_user_agent: navigator.userAgent
      },
      custom_data: {
        test_source: "manual_test",
        timestamp: new Date().toISOString()
      }
    };
    
    // Send to gateway using image pixel method
    var img = new Image();
    img.onload = function() { console.log("Gateway test successful!"); };
    img.onerror = function() { console.error("Gateway test failed!"); };
    img.src = "${gatewayUrl}?d=" + encodeURIComponent(JSON.stringify(testEvent)) + "&t=" + new Date().getTime();
  });
</script>
          `,
        },
        gatewayUrl: gatewayUrl,
        testResult: data,
      }

      setTestResult(debugInstructions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shopify Integration Debug</h1>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to Home
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Shopify to Gateway Connection</CardTitle>
          <CardDescription>Verify your Shopify store can connect to the Facebook Pixel Gateway</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shopDomain">Shopify Store Domain</Label>
              <Input
                id="shopDomain"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="your-store.myshopify.com"
              />
            </div>

            <div>
              <Label htmlFor="pixelId">Facebook Pixel ID</Label>
              <Input
                id="pixelId"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="123456789012345"
              />
            </div>

            <div>
              <Label htmlFor="gatewayUrl">Gateway URL</Label>
              <Input id="gatewayUrl" value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)} />
              <p className="text-sm text-gray-500 mt-1">
                This should be the URL of your Facebook Pixel Gateway's tracking endpoint
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={testShopifyConnection} disabled={loading} className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {loading ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Alert variant={testResult.testResult.success ? "default" : "destructive"}>
                {testResult.testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>Gateway Test</AlertTitle>
                <AlertDescription>
                  {testResult.testResult.success
                    ? "Gateway accepted the test event successfully!"
                    : "Gateway rejected the test event."}
                </AlertDescription>
              </Alert>

              <div>
                <h3 className="text-lg font-semibold mb-2">Shopify Web Pixel Extension Settings</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p>
                    <strong>Pixel ID:</strong> {testResult.shopifySetup.extensionSettings.pixelId}
                  </p>
                  <p>
                    <strong>Gateway URL:</strong> {testResult.shopifySetup.extensionSettings.gatewayUrl}
                  </p>
                  <p>
                    <strong>Debug Mode:</strong>{" "}
                    {testResult.shopifySetup.extensionSettings.debug ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Manual Test Code</h3>
                <p className="mb-2">Add this code to your Shopify theme to test the gateway connection:</p>
                <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
                  {testResult.shopifySetup.testCode}
                </pre>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-2">Troubleshooting Steps:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong>Check Web Pixel Extension Settings:</strong> Make sure the Pixel ID and Gateway URL are
                    correctly configured in your Shopify Web Pixel Extension.
                  </li>
                  <li>
                    <strong>Enable Debug Mode:</strong> Set debug: true in your Web Pixel Extension settings to see
                    detailed logs in the browser console.
                  </li>
                  <li>
                    <strong>Test with Manual Code:</strong> Add the test code above to your theme to manually test the
                    gateway connection.
                  </li>
                  <li>
                    <strong>Check Browser Console:</strong> Look for any errors or warnings in the browser console when
                    browsing your Shopify store.
                  </li>
                  <li>
                    <strong>Verify CORS Settings:</strong> Make sure your gateway allows requests from your Shopify
                    store domain.
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
