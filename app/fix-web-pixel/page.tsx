"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw, Trash2 } from "lucide-react"

export default function FixWebPixel() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [pixelId, setPixelId] = useState("864857281256627")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [webPixels, setWebPixels] = useState<any>(null)

  const checkWebPixels = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shopify/check-web-pixels?shop=${encodeURIComponent(shop)}`)
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

  const deleteWebPixel = async (webPixelId: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/shopify/delete-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, webPixelId }),
      })
      const data = await response.json()
      setResults(data)
      console.log("Delete result:", data)

      if (data.success) {
        await checkWebPixels()
      }
    } catch (error) {
      console.error("Delete failed:", error)
      setResults({ success: false, error: "Delete failed" })
    } finally {
      setLoading(false)
    }
  }

  const createWebPixel = async () => {
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/activate-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID: pixelId, // Use the real Facebook Pixel ID
        }),
      })
      const data = await response.json()
      setResults(data)
      console.log("Create result:", data)

      if (data.success) {
        await checkWebPixels()
      }
    } catch (error) {
      console.error("Create failed:", error)
      setResults({ success: false, error: "Create failed" })
    } finally {
      setLoading(false)
    }
  }

  const updateWebPixel = async () => {
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    // For now, we'll use a placeholder Web Pixel ID
    // In a real implementation, you'd get this from the check Web Pixels response
    const webPixelId = "gid://shopify/WebPixel/1" // This would come from the existing Web Pixel

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/update-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID: pixelId,
          webPixelId: webPixelId, // ID of existing Web Pixel
        }),
      })
      const data = await response.json()
      setResults(data)
      console.log("Update result:", data)

      if (data.success) {
        await checkWebPixels()
      }
    } catch (error) {
      console.error("Update failed:", error)
      setResults({ success: false, error: "Update failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Fix Web Pixel Configuration</h1>
        <p className="text-muted-foreground mt-2">Update your Web Pixel to use the correct Facebook Pixel ID</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pixel ID Mismatch</AlertTitle>
            <AlertDescription>
              Your Web Pixel is using "default-account" but your database is configured for pixel ID "864857281256627".
              We need to recreate the Web Pixel with the correct pixel ID.
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
          <CardTitle>Web Pixel Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button onClick={checkWebPixels} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Check Web Pixels
            </Button>
            <Button onClick={updateWebPixel} disabled={loading || !pixelId} variant="secondary">
              Update Existing Web Pixel
            </Button>
            <Button onClick={createWebPixel} disabled={loading || !pixelId} variant="default">
              Create New Web Pixel
            </Button>
          </div>

          {webPixels && (
            <div className="space-y-4">
              <Alert variant={webPixels.success ? "default" : "destructive"}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Web Pixels Status</AlertTitle>
                <AlertDescription>
                  {webPixels.success
                    ? `Found ${webPixels.count} Web Pixel(s)`
                    : `Error: ${webPixels.error || "Unknown error"}`}
                </AlertDescription>
              </Alert>

              {webPixels.success && webPixels.webPixels && webPixels.webPixels.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Current Web Pixels:</h4>
                  {webPixels.webPixels.map((pixel: any, index: number) => (
                    <div key={index} className="p-3 bg-muted rounded flex justify-between items-start">
                      <div>
                        <p>
                          <strong>ID:</strong> {pixel.id}
                        </p>
                        <p>
                          <strong>Settings:</strong> {JSON.stringify(pixel.settings)}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteWebPixel(pixel.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          <CardTitle>Steps to Fix</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Click "Check Web Pixels" to see current Web Pixels</li>
            <li>Delete any existing Web Pixels with wrong settings</li>
            <li>Enter your correct Facebook Pixel ID: 864857281256627</li>
            <li>Click "Create New Web Pixel" to create it with correct settings</li>
            <li>Refresh your store and check console logs for correct pixel ID</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
