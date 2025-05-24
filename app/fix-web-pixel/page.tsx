"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw, TestTube } from "lucide-react"

export default function FixWebPixel() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [pixelId, setPixelId] = useState("864857281256627")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [webPixels, setWebPixels] = useState<any>(null)

  const testGraphQL = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shopify/list-web-pixels-graphql?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()
      setResults(data)
      console.log("GraphQL test result:", data)
    } catch (error) {
      console.error("GraphQL test failed:", error)
      setResults({ success: false, error: "GraphQL test failed" })
    } finally {
      setLoading(false)
    }
  }

  const testCreateWebPixel = async () => {
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/test-web-pixel-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID: pixelId,
        }),
      })
      const data = await response.json()
      setResults(data)
      console.log("Create test result:", data)
    } catch (error) {
      console.error("Create test failed:", error)
      setResults({ success: false, error: "Create test failed" })
    } finally {
      setLoading(false)
    }
  }

  const checkWebPixels = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shopify/list-web-pixels?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()
      setWebPixels(data)
      console.log("Web Pixels check result:", data)
    } catch (error) {
      console.error("Web Pixels check failed:", error)
      setWebPixels({ success: false, error: "Failed to check Web Pixels" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Fix Web Pixel Configuration</h1>
        <p className="text-muted-foreground mt-2">Debug and fix your Web Pixel setup</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Web Pixels API Issue</AlertTitle>
            <AlertDescription>
              The REST API for Web Pixels returned 404. Let's test the GraphQL API and try creating a Web Pixel
              directly.
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
          <CardTitle>Debug & Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={testGraphQL} disabled={loading} variant="outline">
              <TestTube className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Test GraphQL API
            </Button>
            <Button onClick={testCreateWebPixel} disabled={loading || !pixelId} variant="default">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Create Web Pixel
            </Button>
            <Button onClick={checkWebPixels} disabled={loading} variant="secondary">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Try REST API
            </Button>
          </div>

          {webPixels && (
            <Alert variant={webPixels.success ? "default" : "destructive"}>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>REST API Result</AlertTitle>
              <AlertDescription>
                {webPixels.success ? `Success: ${webPixels.message}` : `Error: ${webPixels.error}`}
              </AlertDescription>
            </Alert>
          )}
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
            <Textarea value={JSON.stringify(results, null, 2)} readOnly className="min-h-[200px] font-mono text-sm" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Click "Test GraphQL API" to verify API connection</li>
            <li>Enter your Facebook Pixel ID: 864857281256627</li>
            <li>Click "Create Web Pixel" to create/update the Web Pixel</li>
            <li>Check your store's browser console for pixel detection</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
