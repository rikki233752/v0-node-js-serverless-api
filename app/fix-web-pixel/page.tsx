"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, TestTube, Zap } from "lucide-react"

export default function FixWebPixel() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [pixelId, setPixelId] = useState("864857281256627")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const exploreGraphQL = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shopify/explore-graphql?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()
      setResults(data)
      console.log("GraphQL exploration result:", data)
    } catch (error) {
      console.error("GraphQL exploration failed:", error)
      setResults({ success: false, error: "GraphQL exploration failed" })
    } finally {
      setLoading(false)
    }
  }

  const createOrUpdateWebPixel = async () => {
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/create-or-update-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID: pixelId,
        }),
      })
      const data = await response.json()
      setResults(data)
      console.log("Create/Update result:", data)
    } catch (error) {
      console.error("Create/Update failed:", error)
      setResults({ success: false, error: "Create/Update failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Fix Web Pixel Configuration</h1>
        <p className="text-muted-foreground mt-2">Create or update your Web Pixel with the correct settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Approach</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>New Strategy</AlertTitle>
            <AlertDescription>
              Since listing Web Pixels is complex, we'll try to create a Web Pixel directly. If one already exists,
              Shopify will tell us and we can handle it accordingly.
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
            <Button onClick={exploreGraphQL} disabled={loading} variant="outline">
              <TestTube className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Explore GraphQL Schema
            </Button>
            <Button onClick={createOrUpdateWebPixel} disabled={loading || !pixelId} variant="default">
              <Zap className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Create/Update Web Pixel
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
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Enter your Facebook Pixel ID: 864857281256627</li>
            <li>Click "Create/Update Web Pixel" to set up the Web Pixel with correct settings</li>
            <li>If it says "already exists", we'll handle updating the existing one</li>
            <li>Check your store's browser console for the correct pixel ID</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
