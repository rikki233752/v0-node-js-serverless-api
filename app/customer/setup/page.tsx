"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, Settings, ExternalLink } from "lucide-react"

export default function CustomerSetup() {
  const [shop, setShop] = useState("")
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [pixelId, setPixelId] = useState<string | null>(null)
  const [pixelName, setPixelName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testingEvents, setTestingEvents] = useState(false)

  // Get shop from URL params or cookies
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get("shop")

    if (shopParam) {
      setShop(shopParam)
      checkConfiguration(shopParam)
    } else {
      // Try to get from cookie
      const shopCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("shopify_shop="))
        ?.split("=")[1]

      if (shopCookie) {
        setShop(shopCookie)
        checkConfiguration(shopCookie)
      } else {
        setLoading(false)
        setError("Shop not found. Please install the app first.")
      }
    }
  }, [])

  const checkConfiguration = async (shopDomain: string) => {
    try {
      const response = await fetch(`/api/customer/setup-pixel?shop=${shopDomain}`)
      const data = await response.json()

      if (data.success) {
        setConfigured(data.configured)
        setPixelId(data.pixelId)
        setPixelName(data.pixelName)

        if (!data.configured) {
          setError("Your Facebook Pixel has not been configured yet. Please contact support to set up your pixel.")
        }
      } else {
        setError(data.error || "Failed to check configuration")
      }
    } catch (err) {
      console.error("Error checking configuration:", err)
      setError("Failed to check configuration")
    } finally {
      setLoading(false)
    }
  }

  const testPixelEvents = async () => {
    setTestingEvents(true)
    try {
      const response = await fetch("/api/test-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelId: pixelId,
          testEvent: true,
          shop: shop,
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert("Test event sent successfully! Check your Facebook Events Manager.")
      } else {
        alert("Test failed: " + data.error)
      }
    } catch (err) {
      alert("Test failed: " + err)
    } finally {
      setTestingEvents(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking your Facebook Pixel configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {configured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            Facebook Pixel Gateway
          </CardTitle>
          <CardDescription>
            {configured
              ? "Your Facebook Pixel is configured and actively tracking events from your store."
              : "Your Facebook Pixel configuration is pending."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && !configured && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {configured ? (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>✅ Configuration Active!</strong>
                  <br />
                  <strong>Pixel ID:</strong> {pixelId}
                  <br />
                  <strong>Name:</strong> {pixelName}
                  <br />
                  <strong>Shop:</strong> {shop}
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  What's Happening Now
                </h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      <strong>Page Views</strong> - Tracked when customers visit your store
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      <strong>Add to Cart</strong> - Tracked when customers add products to cart
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      <strong>Purchases</strong> - Tracked when customers complete orders
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      <strong>Product Views</strong> - Tracked when customers view product pages
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={testPixelEvents} disabled={testingEvents} variant="outline">
                  {testingEvents ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Send Test Event"
                  )}
                </Button>

                <Button asChild variant="outline">
                  <a
                    href="https://business.facebook.com/events_manager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    View Events Manager
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Events appear in Facebook Events Manager within 15-30 minutes</li>
                  <li>• Use the Test Event button to verify your setup</li>
                  <li>• All events are sent via Facebook Conversions API for better tracking</li>
                  <li>• No additional setup needed - everything is automated!</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Configuration Pending</strong>
                  <br />
                  Your Facebook Pixel needs to be configured by our team. This usually takes 24-48 hours after app
                  installation.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-semibold">What happens next?</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Our team will configure your Facebook Pixel within 24-48 hours</li>
                  <li>You'll receive an email notification when setup is complete</li>
                  <li>No action required from you - everything is handled automatically</li>
                  <li>Return to this page to check your configuration status</li>
                </ul>
              </div>

              <Button onClick={() => checkConfiguration(shop)} variant="outline" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Configuration Status"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
