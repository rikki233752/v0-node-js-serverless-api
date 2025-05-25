"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Code, Copy, Check, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function WebsiteSetupPage() {
  const searchParams = useSearchParams()
  const [pixelId, setPixelId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [showScript, setShowScript] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get the actual gateway URL from environment variables
  const gatewayUrl = process.env.NEXT_PUBLIC_HOST || "https://v0-node-js-serverless-api-lake.vercel.app"

  // Pre-fill pixel ID from URL parameters
  useEffect(() => {
    const urlPixelId = searchParams.get("pixel_id") || searchParams.get("utm_pixel_id")
    if (urlPixelId) {
      setPixelId(urlPixelId)
    }
  }, [searchParams])

  const handleGenerateScript = () => {
    setError(null)

    // Validate inputs
    if (!pixelId.trim()) {
      setError("Please enter your Facebook Pixel ID")
      return
    }

    if (!accessToken.trim()) {
      setError("Please enter your Facebook Access Token")
      return
    }

    // Validate pixel ID format
    if (!/^\d+$/.test(pixelId)) {
      setError("Please enter a valid Facebook Pixel ID (numbers only)")
      return
    }

    setShowScript(true)
  }

  const trackingScript = `<!-- Facebook Pixel Gateway Script -->
<script>
(function() {
  // Configuration
  var config = {
    pixelId: '${pixelId}',
    gatewayUrl: '${gatewayUrl}/api/track'
  };

  // Initialize tracking
  window.fbqGateway = window.fbqGateway || [];
  
  // Override standard fbq function
  window.fbq = window.fbq || function() {
    var args = Array.prototype.slice.call(arguments);
    
    // Send to gateway
    if (args[0] === 'track' || args[0] === 'trackCustom') {
      var eventData = {
        pixelId: config.pixelId,
        event_name: args[1],
        custom_data: args[2] || {},
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: window.location.href,
        user_data: {
          client_user_agent: navigator.userAgent,
          fbp: getCookie('_fbp'),
          fbc: getCookie('_fbc')
        }
      };
      
      // Send to gateway
      fetch(config.gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      }).catch(function(error) {
        console.error('Gateway tracking error:', error);
      });
    }
    
    // Store for later processing
    window.fbqGateway.push(args);
  };
  
  // Helper function to get cookies
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }
  
  // Track page view on load
  fbq('track', 'PageView');
  
  // Optional: Track standard e-commerce events
  // Uncomment and customize as needed:
  
  // // Track Add to Cart
  // document.addEventListener('click', function(e) {
  //   if (e.target.matches('.add-to-cart-button')) {
  //     fbq('track', 'AddToCart', {
  //       content_type: 'product',
  //       content_ids: [e.target.dataset.productId],
  //       value: parseFloat(e.target.dataset.price),
  //       currency: 'USD'
  //     });
  //   }
  // });
  
})();
</script>
<!-- End Facebook Pixel Gateway Script -->`

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveConfiguration = async () => {
    try {
      // Save configuration to database
      const response = await fetch("/api/website/configure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixelId,
          accessToken,
        }),
      })

      if (response.ok) {
        alert("Configuration saved successfully!")
      } else {
        throw new Error("Failed to save configuration")
      }
    } catch (error) {
      setError("Failed to save configuration. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Code className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-2xl">Install on Any Website</CardTitle>
                <CardDescription>Add server-side tracking to your website</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!showScript ? (
              <>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pixel-id">Facebook Pixel ID</Label>
                    <Input
                      id="pixel-id"
                      type="text"
                      placeholder="e.g., 123456789012345"
                      value={pixelId}
                      onChange={(e) => setPixelId(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">Find this in your Facebook Events Manager</p>
                  </div>

                  <div>
                    <Label htmlFor="access-token">Facebook Access Token</Label>
                    <Input
                      id="access-token"
                      type="password"
                      placeholder="Your Conversions API access token"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Generate this in Facebook Events Manager under Settings → Conversions API
                    </p>
                  </div>
                </div>

                <Button onClick={handleGenerateScript} className="w-full" size="lg">
                  Generate Tracking Script
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Your Tracking Script</Label>
                      <Button variant="outline" size="sm" onClick={handleCopy} className="flex items-center gap-2">
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Script
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-sm">
                        <code>{trackingScript}</code>
                      </pre>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>Installation Instructions:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Copy the script above</li>
                        <li>Paste it into your website's HTML, just before the closing &lt;/head&gt; tag</li>
                        <li>The script will automatically start tracking events</li>
                        <li>Check your Facebook Events Manager to verify events are being received</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4">
                    <Button onClick={handleSaveConfiguration} className="flex-1">
                      Save Configuration
                    </Button>
                    <Button variant="outline" onClick={() => setShowScript(false)} className="flex-1">
                      Back to Setup
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              Need help? Check our{" "}
              <Link href="/integration-guide" className="text-blue-600 hover:underline">
                integration guide
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="text-blue-600 hover:underline">
                contact support
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
