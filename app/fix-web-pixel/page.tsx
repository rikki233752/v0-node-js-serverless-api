"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Target, ExternalLink, RefreshCw } from "lucide-react"

export default function FixWebPixel() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [pixelId, setPixelId] = useState("864857281256627")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleAction = async (endpoint: string, buttonText: string) => {
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID: pixelId,
        }),
      })

      const data = await response.json()
      setResults(data)
      console.log(`${buttonText} result:`, data)
    } catch (error) {
      console.error(`${buttonText} failed:`, error)
      setResults({ success: false, error: `${buttonText} failed`, details: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getRealWebPixel = () => handleAction("/api/shopify/get-real-web-pixel", "Get & Update Web Pixel")
  const recreateWebPixel = () => handleAction("/api/shopify/recreate-web-pixel", "Recreate Web Pixel")

  const openShopifyAdmin = () => {
    window.open(`https://${shop}/admin/settings/customer_events`, "_blank")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Fix Web Pixel Configuration</h1>
        <p className="text-muted-foreground mt-2">Get the real Web Pixel ID and update settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Not Received</AlertTitle>
            <AlertDescription>
              The Web Pixel Extension is not receiving settings from Shopify. Console shows: "No configuration.settings
              found!" This means we need to recreate the Web Pixel with proper settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shop">Shopify Store Domain</Label>
            <Input
              id="shop"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="your-store.myshopify.com"
            />
          </div>
          <div>
            <Label htmlFor="pixelId">Facebook Pixel ID</Label>
            <Input
              id="pixelId"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="864857281256627"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button onClick={getRealWebPixel} disabled={loading || !pixelId} variant="outline">
              <Target className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Get & Update Web Pixel
            </Button>
            <Button onClick={recreateWebPixel} disabled={loading || !pixelId} variant="default">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Recreate Web Pixel
            </Button>
            <Button onClick={openShopifyAdmin} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Shopify Admin
            </Button>
          </div>

          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Recommended Action</AlertTitle>
            <AlertDescription>
              Click "Recreate Web Pixel" to delete the current Web Pixel and create a new one with proper settings. This
              should fix the configuration issue.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.success && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>{results.message}</AlertDescription>
              </Alert>
            )}
            <Textarea value={JSON.stringify(results, null, 2)} readOnly className="min-h-[300px] font-mono text-sm" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Next Steps After Recreating</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Wait 2-3 minutes for Shopify to deploy the new Web Pixel</li>
            <li>Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)</li>
            <li>Check console logs - should show settings being received</li>
            <li>Look for: "✅ [Web Pixel Gateway] Using Pixel ID: 864857281256627"</li>
            <li>Test add to cart to verify tracking works</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
