"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle } from "lucide-react"

export default function RegisterFinalPixelPage() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    if (!shop) {
      setError("Please enter a shop domain")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/shopify/register-final-pixel?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to register Web Pixel")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleFixPixelLink = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/fix-shop-pixel-link?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fix shop pixel link")
      }

      setResult({
        ...result,
        pixelLinkFixed: true,
        previousPixelId: data.previousPixelId,
        newPixelId: data.newPixelId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Register Final Web Pixel Extension</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Register Web Pixel</CardTitle>
          <CardDescription>Register the final Web Pixel extension for your shop</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop">Shop Domain</Label>
              <Input
                id="shop"
                placeholder="your-store.myshopify.com"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
              />
            </div>

            <Button onClick={handleRegister} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Web Pixel"
              )}
            </Button>

            {result && !result.pixelLinkFixed && (
              <Button onClick={handleFixPixelLink} disabled={loading} className="w-full mt-2" variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  "Fix Shop Pixel Link"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Web Pixel Registered
            </CardTitle>
            <CardDescription>The Web Pixel extension has been registered successfully</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Existing Pixels:</span> {result.existingPixels}
              </p>
              <p className="text-sm">
                <span className="font-medium">Deleted Pixels:</span> {result.deletedPixels}
              </p>
              {result.newPixel && (
                <p className="text-sm">
                  <span className="font-medium">New Pixel ID:</span> {result.newPixel.id}
                </p>
              )}
              {result.pixelLinkFixed && (
                <>
                  <p className="text-sm">
                    <span className="font-medium">Previous Pixel ID:</span> {result.previousPixelId}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">New Pixel ID:</span> {result.newPixelId}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
