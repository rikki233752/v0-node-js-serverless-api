"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Zap, Bug } from "lucide-react"

export default function FixWebPixel() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [pixelId, setPixelId] = useState("864857281256627")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const debugWebPixel = async () => {
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/debug-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID: pixelId,
        }),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)

      const data = await response.json()
      setResults(data)
      console.log("Debug result:", data)
    } catch (error) {
      console.error("Debug failed:", error)
      setResults({ success: false, error: "Debug failed", details: error.message })
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

      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)

      const data = await response.json()
      setResults(data)
      console.log("Create/Update result:", data)
    } catch (error) {
      console.error("Create/Update failed:", error)
      setResults({ success: false, error: "Create/Update failed", details: error.message })
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
          <CardTitle>Debug Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Step-by-Step Debugging</AlertTitle>
            <AlertDescription>
              First run the debug endpoint to see exactly where the issue is, then try the full creation.
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
            <Button onClick={debugWebPixel} disabled={loading || !pixelId} variant="outline">
              <Bug className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Debug Web Pixel
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
            <li>First click "Debug Web Pixel" to see where the issue is</li>
            <li>If debug succeeds, then try "Create/Update Web Pixel"</li>
            <li>Check the browser console and server logs for detailed info</li>
            <li>Verify the result in your store's browser console</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
