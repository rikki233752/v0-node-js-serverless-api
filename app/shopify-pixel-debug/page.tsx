"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { XCircle, AlertCircle, RefreshCw, CheckCircle, Info } from "lucide-react"

export default function ShopifyPixelDebug() {
  const [shop, setShop] = useState("")
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [capabilities, setCapabilities] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Get shop from URL params if available
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get("shop")
    if (shopParam) {
      setShop(shopParam)
    }
  }, [])

  const checkStoreCapabilities = async () => {
    if (!shop) {
      setError("Please enter a shop domain")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shopify/store-capabilities?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()

      if (response.ok) {
        setCapabilities(data)
        setError(null)
      } else {
        setError(data.error || "Failed to check store capabilities")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const registerScriptTag = async () => {
    if (!shop) {
      setError("Please enter a shop domain")
      return
    }

    setRegistering(true)
    setError(null)

    try {
      const response = await fetch("/api/shopify/register-script-tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shop }),
      })

      const data = await response.json()

      if (data.success) {
        await checkStoreCapabilities() // Refresh capabilities
        setError(null)
      } else {
        setError(data.error || "Failed to register script tag")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setRegistering(false)
    }
  }

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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shopify Store Debug & Setup</h1>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to Home
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Store Analysis</CardTitle>
          <CardDescription>Check your store's capabilities and setup tracking</CardDescription>
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
              <Button onClick={checkStoreCapabilities} disabled={loading || !shop} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Checking..." : "Check Store Capabilities"}
              </Button>

              <Button onClick={checkPixelStatus} disabled={loading || !shop} variant="secondary">
                Check Pixel Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {capabilities && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Store Name:</strong> {capabilities.shopDetails?.name || "Unknown"}
                </div>
                <div>
                  <strong>Plan:</strong>{" "}
                  {capabilities.shopDetails?.plan_display_name || capabilities.shopDetails?.plan_name || "Unknown"}
                </div>
                <div>
                  <strong>Country:</strong> {capabilities.shopDetails?.country_name || "Unknown"}
                </div>
                <div>
                  <strong>Development Store:</strong>{" "}
                  <Badge variant={capabilities.capabilities?.isDevelopmentStore ? "secondary" : "default"}>
                    {capabilities.capabilities?.isDevelopmentStore ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Web Pixels API</span>
                  <Badge
                    variant={
                      capabilities.capabilities?.pixelsApi &&
                      Object.values(capabilities.capabilities.pixelsApi).some((api: any) => api.available)
                        ? "default"
                        : "destructive"
                    }
                  >
                    {capabilities.capabilities?.pixelsApi &&
                    Object.values(capabilities.capabilities.pixelsApi).some((api: any) => api.available)
                      ? "Available"
                      : "Not Available"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span>Script Tags API</span>
                  <Badge variant={capabilities.capabilities?.scriptTags?.available ? "default" : "destructive"}>
                    {capabilities.capabilities?.scriptTags?.available ? "Available" : "Not Available"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span>Webhooks API</span>
                  <Badge variant={capabilities.capabilities?.webhooks?.available ? "default" : "destructive"}>
                    {capabilities.capabilities?.webhooks?.available ? "Available" : "Not Available"}
                  </Badge>
                </div>
              </div>

              {capabilities.capabilities?.scopes?.missing?.length > 0 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing Permissions</AlertTitle>
                  <AlertDescription>
                    Missing scopes: {capabilities.capabilities.scopes.missing.join(", ")}
                    <br />
                    Please reinstall the app to grant these permissions.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Solution</CardTitle>
            </CardHeader>
            <CardContent>
              {capabilities.capabilities?.scriptTags?.available ? (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Script Tags Available</AlertTitle>
                    <AlertDescription>
                      Since Web Pixels API is not available, we can use Script Tags to inject Facebook Pixel tracking
                      code into your store.
                    </AlertDescription>
                  </Alert>

                  <Button onClick={registerScriptTag} disabled={registering} className="flex items-center gap-2">
                    {registering ? "Setting up..." : "Setup Script Tag Tracking"}
                  </Button>
                </div>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Limited API Access</AlertTitle>
                  <AlertDescription>
                    This store has limited API access. You may need to:
                    <ul className="list-disc pl-5 mt-2">
                      <li>Upgrade to a paid Shopify plan</li>
                      <li>Use a production store instead of a development store</li>
                      <li>Contact Shopify support for assistance</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {capabilities.recommendations && capabilities.recommendations.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Recommendations:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {capabilities.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pixel Status Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Understanding the Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Why Web Pixels API Might Not Be Available</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Development Store:</strong> Shopify development stores have limited API access
                </li>
                <li>
                  <strong>Plan Limitations:</strong> Some Shopify plans don't support advanced APIs
                </li>
                <li>
                  <strong>New Feature:</strong> Web Pixels is a relatively new feature and may not be available on all
                  stores
                </li>
                <li>
                  <strong>Regional Restrictions:</strong> Some features may not be available in all regions
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
