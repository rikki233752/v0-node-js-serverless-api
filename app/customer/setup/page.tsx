"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, AlertCircle, Loader2, Settings, ExternalLink, Clock, Info } from "lucide-react"

export default function CustomerSetup() {
  const [shop, setShop] = useState("")
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [pixelId, setPixelId] = useState<string>("")
  const [accessToken, setAccessToken] = useState<string>("")
  const [pixelName, setPixelName] = useState<string>("")
  const [configurationStatus, setConfigurationStatus] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [testingEvents, setTestingEvents] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

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
      setLoading(true)
      const response = await fetch(`/api/customer/setup-pixel?shop=${shopDomain}`)
      const data = await response.json()

      console.log("🔍 [Setup Page] API Response:", data)

      if (data.success) {
        setConfigured(data.configured)
        if (data.pixelId) setPixelId(data.pixelId)
        if (data.pixelName) setPixelName(data.pixelName)
        setConfigurationStatus(data.configurationStatus)
        setMessage(data.message)

        if (!data.configured) {
          setError(null) // Clear error since we'll show the configuration form
        } else {
          setError(null)
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

  const handleConfigurePixel = async (e: React.FormEvent) => {
    e.preventDefault()
    setConfiguring(true)
    setError(null)
    setSuccess(null)

    if (!pixelId || !accessToken) {
      setError("Pixel ID and Access Token are required")
      setConfiguring(false)
      return
    }

    try {
      const response = await fetch("/api/customer/setup-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          pixelId,
          accessToken,
          pixelName: pixelName || `${shop} Pixel`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess("Facebook Pixel configured successfully!")
        // Refresh the configuration status
        checkConfiguration(shop)
      } else {
        setError(data.error || "Failed to configure pixel")
      }
    } catch (err) {
      console.error("Error configuring pixel:", err)
      setError("An error occurred while configuring the pixel")
    } finally {
      setConfiguring(false)
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

  const getStatusIcon = () => {
    if (configured) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    switch (configurationStatus) {
      case "shop_exists_no_pixel":
      case "pixel_exists_no_token":
        return <Clock className="h-5 w-5 text-orange-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusMessage = () => {
    if (configured) {
      return "Your Facebook Pixel is configured and actively tracking events from your store."
    }
    switch (configurationStatus) {
      case "shop_exists_no_pixel":
        return "Your shop is registered but your Facebook Pixel needs to be configured."
      case "pixel_exists_no_token":
        return "Your pixel is detected but missing access token configuration."
      case "shop_not_found":
        return "Your shop was not found in our system."
      default:
        return "Your Facebook Pixel configuration is pending."
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
            {getStatusIcon()}
            Facebook Pixel Gateway
          </CardTitle>
          <CardDescription>{getStatusMessage()}</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Tabs defaultValue="self-service" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="self-service">Configure Now</TabsTrigger>
                <TabsTrigger value="admin-service">Admin Service</TabsTrigger>
              </TabsList>

              <TabsContent value="self-service" className="space-y-4 mt-4">
                <Alert variant="default" className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configure your Facebook Pixel</strong>
                    <br />
                    Enter your Facebook Pixel ID and Access Token to start tracking events immediately.
                  </AlertDescription>
                </Alert>

                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleConfigurePixel} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pixelId">Facebook Pixel ID *</Label>
                    <Input
                      id="pixelId"
                      value={pixelId}
                      onChange={(e) => setPixelId(e.target.value)}
                      placeholder="123456789012345"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Find this in your Facebook Events Manager under Data Sources
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Facebook Access Token *</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="EAABsbCc1234567890..."
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Generate this in Facebook Business Settings under System Users
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pixelName">Pixel Name (Optional)</Label>
                    <Input
                      id="pixelName"
                      value={pixelName}
                      onChange={(e) => setPixelName(e.target.value)}
                      placeholder="My Store Pixel"
                    />
                  </div>

                  <Button type="submit" disabled={configuring} className="w-full">
                    {configuring ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Configuring...
                      </>
                    ) : (
                      "Configure Pixel"
                    )}
                  </Button>
                </form>

                <div className="p-4 bg-blue-50 rounded-lg mt-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to find your Pixel ID</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>
                      Go to your{" "}
                      <a
                        href="https://business.facebook.com/events_manager"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Facebook Events Manager
                      </a>
                    </li>
                    <li>Select your pixel under "Data Sources"</li>
                    <li>Click on "Settings"</li>
                    <li>Your Pixel ID is displayed at the top</li>
                  </ol>
                </div>
              </TabsContent>

              <TabsContent value="admin-service" className="space-y-4 mt-4">
                <Alert variant={configurationStatus === "shop_not_found" ? "destructive" : "default"}>
                  {configurationStatus === "shop_not_found" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <strong>
                      {configurationStatus === "shop_not_found" ? "Shop Not Found" : "Configuration Pending"}
                    </strong>
                    <br />
                    {message}
                    {pixelId && (
                      <>
                        <br />
                        <strong>Detected Pixel ID:</strong> {pixelId}
                      </>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h3 className="font-semibold">What happens next?</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {configurationStatus === "shop_not_found" ? (
                      <>
                        <li>Please reinstall the app to register your shop</li>
                        <li>Contact support if the issue persists</li>
                      </>
                    ) : (
                      <>
                        <li>Our team will configure your Facebook Pixel within 24-48 hours</li>
                        <li>You'll receive an email notification when setup is complete</li>
                        <li>No action required from you - everything is handled automatically</li>
                        <li>Return to this page to check your configuration status</li>
                      </>
                    )}
                  </ul>
                </div>

                <Button
                  onClick={() => checkConfiguration(shop)}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check Configuration Status"
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
