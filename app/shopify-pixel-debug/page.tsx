"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { XCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function ShopifyPixelDebug() {
  const [shop, setShop] = useState("")
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Get shop from URL params if available
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get("shop")
    if (shopParam) {
      setShop(shopParam)
    }
  }, [])

  const checkPixelStatus = async () => {
    if (!shop) {
      setError("Please enter a shop domain")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/debug/shopify-pixel?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to check pixel status")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const registerPixel = async () => {
    if (!shop) {
      setError("Please enter a shop domain")
      return
    }

    setRegistering(true)
    setError(null)

    try {
      const response = await fetch("/api/shopify/register-pixel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shop }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh the status after registration
        await checkPixelStatus()
      } else {
        setError(data.error || "Failed to register pixel")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shopify Web Pixel Debug</h1>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to Home
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Check Web Pixel Status</CardTitle>
          <CardDescription>Debug the Web Pixel Extension registration in Shopify</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shop">Shopify Store Domain</Label>
              <Input
                id="shop"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                placeholder="your-store.myshopify.com"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={checkPixelStatus} disabled={loading || !shop} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Checking..." : "Check Status"}
              </Button>

              <Button
                onClick={registerPixel}
                disabled={registering || !shop}
                variant="outline"
                className="flex items-center gap-2"
              >
                {registering ? "Registering..." : "Register Web Pixel"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Shop Name:</strong> {result.shop?.name || "Unknown"}
                </div>
                <div>
                  <strong>Domain:</strong> {result.shop?.domain || shop}
                </div>
                <div>
                  <strong>Plan:</strong> {result.shop?.plan_name || "Unknown"}
                </div>
                <div>
                  <strong>Country:</strong> {result.shop?.country_name || "Unknown"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Web Pixels Status</CardTitle>
            </CardHeader>
            <CardContent>
              {result.pixels && result.pixels.length > 0 ? (
                <div className="space-y-4">
                  {result.pixels.map((pixel: any, index: number) => (
                    <div key={index} className="border p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{pixel.name}</h3>
                          <p className="text-sm text-gray-500">ID: {pixel.id}</p>
                          <p className="text-sm text-gray-500">Status: {pixel.status}</p>
                        </div>
                        <Badge variant={pixel.status === "active" ? "default" : "secondary"}>{pixel.status}</Badge>
                      </div>
                      {pixel.settings && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm">View Settings</summary>
                          <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                            {JSON.stringify(pixel.settings, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Web Pixels Found</AlertTitle>
                  <AlertDescription>
                    No Web Pixel Extensions are registered for this store. This might be why the app shows as
                    disconnected in Customer Events.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Events</CardTitle>
            </CardHeader>
            <CardContent>
              {result.customerEvents && result.customerEvents.length > 0 ? (
                <div className="space-y-2">
                  {result.customerEvents.map((event: any, index: number) => (
                    <div key={index} className="border p-2 rounded">
                      <strong>{event.name}</strong> - {event.status}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No customer events configured</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>App Connection Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Installed:</strong>{" "}
                  <Badge variant={result.installed ? "default" : "destructive"}>
                    {result.installed ? "Yes" : "No"}
                  </Badge>
                </p>
                <p>
                  <strong>Scopes:</strong> {result.scopes}
                </p>
                <p>
                  <strong>Access Token:</strong> {result.accessToken}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Troubleshooting Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Check Web Pixel Registration:</strong> If no Web Pixels are found, click "Register Web Pixel" to
              create one.
            </li>
            <li>
              <strong>Verify App Permissions:</strong> Make sure the app has the correct scopes (read_pixels,
              write_pixels, read_customer_events).
            </li>
            <li>
              <strong>Check Shopify Partner Dashboard:</strong> Ensure your app is properly configured with the correct
              extension files.
            </li>
            <li>
              <strong>Rebuild Extension:</strong> If you have the Shopify CLI, try rebuilding and deploying the Web
              Pixel Extension.
            </li>
            <li>
              <strong>Contact Shopify Support:</strong> If the issue persists, there might be a platform-level issue.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
