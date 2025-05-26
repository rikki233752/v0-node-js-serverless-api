"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, AlertCircle, Settings, BarChart, Code, RefreshCw } from "lucide-react"

export default function AppDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const shop = searchParams.get("shop")
  const [loading, setLoading] = useState(true)
  const [shopConfig, setShopConfig] = useState<any>(null)
  const [pixelConfig, setPixelConfig] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shop) {
      setError("No shop parameter provided")
      setLoading(false)
      return
    }

    // Fetch shop configuration
    const fetchShopConfig = async () => {
      try {
        const response = await fetch(`/api/track/config?shop=${shop}`)
        const data = await response.json()

        if (data.success) {
          setShopConfig(data)
          setPixelConfig(data.pixelId ? { pixelId: data.pixelId } : null)
        } else {
          setError(data.error || "Failed to load shop configuration")
        }
      } catch (err) {
        setError("Error fetching shop configuration")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchShopConfig()
  }, [shop])

  const handleConfigurePixel = () => {
    router.push(`/customer/setup?shop=${shop}`)
  }

  const handleRefreshStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/detect-pixel?shop=${shop}`)
      const data = await response.json()

      if (data.success && data.pixelId) {
        // Refresh the page to show updated config
        window.location.reload()
      } else {
        // Just refresh the config
        const configResponse = await fetch(`/api/track/config?shop=${shop}`)
        const configData = await configResponse.json()

        if (configData.success) {
          setShopConfig(configData)
          setPixelConfig(configData.pixelId ? { pixelId: configData.pixelId } : null)
        }
      }
    } catch (err) {
      setError("Error refreshing status")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center text-red-700">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error
            </CardTitle>
            <CardDescription className="text-red-600">
              There was a problem loading your shop configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-700">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Facebook Pixel Gateway</h1>
        <p className="text-gray-600">
          Shop: <span className="font-medium">{shop}</span>
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full max-w-4xl">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {pixelConfig ? (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                      Pixel Connected
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
                      Pixel Not Configured
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {pixelConfig
                    ? "Your Facebook Pixel is connected and tracking events"
                    : "Connect your Facebook Pixel to start tracking events"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pixelConfig ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Pixel ID:</span>
                      <span className="text-sm">{pixelConfig.pixelId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    No Facebook Pixel configured for this store. Click below to set up your pixel.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                {pixelConfig ? (
                  <Button variant="outline" onClick={handleRefreshStatus} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                ) : (
                  <Button onClick={handleConfigurePixel} className="w-full">
                    Configure Pixel
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="mr-2 h-5 w-5 text-blue-500" />
                  Event Tracking
                </CardTitle>
                <CardDescription>
                  {pixelConfig
                    ? "Events are being tracked and sent to Facebook"
                    : "Configure your pixel to start tracking events"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Page Views:</span>
                    <span className="text-sm">{pixelConfig ? "Tracking" : "Not tracking"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Add to Cart:</span>
                    <span className="text-sm">{pixelConfig ? "Tracking" : "Not tracking"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Checkout:</span>
                    <span className="text-sm">{pixelConfig ? "Tracking" : "Not tracking"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Purchase:</span>
                    <span className="text-sm">{pixelConfig ? "Tracking" : "Not tracking"}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled={!pixelConfig}>
                  <Code className="mr-2 h-4 w-4" />
                  View Event Logs
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5 text-gray-500" />
                Pixel Settings
              </CardTitle>
              <CardDescription>Manage your Facebook Pixel configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {pixelConfig ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Facebook Pixel ID</label>
                    <div className="flex">
                      <input
                        type="text"
                        value={pixelConfig.pixelId}
                        readOnly
                        className="flex-1 px-3 py-2 border rounded-md bg-gray-50"
                      />
                      <Button variant="outline" className="ml-2">
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gateway Status</label>
                    <div className="flex items-center">
                      <div
                        className={`h-3 w-3 rounded-full mr-2 ${
                          shopConfig?.gatewayEnabled ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <span>{shopConfig?.gatewayEnabled ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-600 mb-4">No Facebook Pixel configured for this store.</p>
                  <Button onClick={handleConfigurePixel}>Configure Pixel Now</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Event Logs</CardTitle>
              <CardDescription>Recent events tracked by your Facebook Pixel</CardDescription>
            </CardHeader>
            <CardContent>
              {pixelConfig ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Event logs will appear here once events are tracked.</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">Configure your Facebook Pixel to start tracking events.</p>
                  <Button onClick={handleConfigurePixel}>Configure Pixel Now</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
