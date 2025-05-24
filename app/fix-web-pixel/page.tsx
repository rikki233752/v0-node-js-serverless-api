"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Target, ExternalLink } from "lucide-react"

export default function FixWebPixel() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [pixelId, setPixelId] = useState("864857281256627")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const getRealWebPixel = async () => {
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/get-real-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID: pixelId,
        }),
      })

      const data = await response.json()
      setResults(data)
      console.log("Get real Web Pixel result:", data)
    } catch (error) {
      console.error("Get real Web Pixel failed:", error)
      setResults({ success: false, error: "Get real Web Pixel failed", details: error.message })
    } finally {
      setLoading(false)
    }
  }

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
          <CardTitle>Direct Web Pixel Query</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Simple & Reliable</AlertTitle>
            <AlertDescription>
              Uses the direct GraphQL query to fetch your actual Web Pixel ID, then updates it with the correct Facebook
              Pixel ID settings.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={getRealWebPixel} disabled={loading || !pixelId} variant="default">
              <Target className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Get & Update Web Pixel
            </Button>
            <Button onClick={openShopifyAdmin} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Shopify Admin
            </Button>
          </div>
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
          <CardTitle>What This Does</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Runs the simple GraphQL query:{" "}
              <code className="bg-muted px-1 rounded">webPixel &#123; id settings &#125;</code>
            </li>
            <li>Gets the real Web Pixel ID from your Shopify store</li>
            <li>Shows you the current settings (probably has "default-account")</li>
            <li>Updates the Web Pixel with your correct Facebook Pixel ID (864857281256627)</li>
            <li>Your Web Pixel will then track events with the correct pixel ID</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
