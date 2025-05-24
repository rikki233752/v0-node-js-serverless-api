"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Zap, Trash2 } from "lucide-react"

export default function FixWebPixel() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [pixelId, setPixelId] = useState("864857281256627")
  const [webPixelId, setWebPixelId] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const smartUpdate = async () => {
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/smart-web-pixel-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID: pixelId,
        }),
      })

      const data = await response.json()
      setResults(data)
      console.log("Smart update result:", data)
    } catch (error) {
      console.error("Smart update failed:", error)
      setResults({ success: false, error: "Smart update failed", details: error.message })
    } finally {
      setLoading(false)
    }
  }

  const deleteWebPixel = async () => {
    if (!webPixelId) {
      alert("Please enter the Web Pixel ID to delete")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/delete-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          webPixelId,
        }),
      })

      const data = await response.json()
      setResults(data)
      console.log("Delete result:", data)
    } catch (error) {
      console.error("Delete failed:", error)
      setResults({ success: false, error: "Delete failed", details: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Fix Web Pixel Configuration</h1>
        <p className="text-muted-foreground mt-2">Handle existing Web Pixel and update settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Situation</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Web Pixel Already Exists</AlertTitle>
            <AlertDescription>
              Your app already has a Web Pixel installed. We need to either update it or delete and recreate it with the
              correct Facebook Pixel ID.
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
          <div>
            <Label htmlFor="webPixelId">Web Pixel ID (for deletion)</Label>
            <Input
              id="webPixelId"
              value={webPixelId}
              onChange={(e) => setWebPixelId(e.target.value)}
              placeholder="gid://shopify/WebPixel/123456789"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Find this in Shopify Admin → Settings → Customer events
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={smartUpdate} disabled={loading || !pixelId} variant="default">
              <Zap className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Smart Update Web Pixel
            </Button>
            <Button onClick={deleteWebPixel} disabled={loading || !webPixelId} variant="destructive">
              <Trash2 className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Delete Web Pixel
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
          <CardTitle>Manual Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Go to your Shopify admin: Settings → Customer events</li>
            <li>Find the existing Web Pixel (should show your app name)</li>
            <li>Copy the Web Pixel ID from the URL or inspect element</li>
            <li>Either delete the existing Web Pixel and create a new one, or update it</li>
            <li>Check your store's browser console for the correct pixel ID</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
