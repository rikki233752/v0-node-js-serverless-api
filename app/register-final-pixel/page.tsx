"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

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
      // First, fix the shop-pixel link
      const linkResponse = await fetch(`/api/fix-shop-pixel-link?shop=${encodeURIComponent(shop)}`)
      const linkData = await linkResponse.json()

      if (!linkResponse.ok) {
        throw new Error(linkData.error || "Failed to fix shop pixel link")
      }

      // Then register the web pixel
      const response = await fetch(`/api/shopify/register-final-pixel?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to register Web Pixel")
      }

      setResult({
        ...data,
        pixelLinkFixed: true,
        previousPixelId: linkData.previousPixelId,
        newPixelId: linkData.newPixelId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Register Final Web Pixel Extension</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
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
              "Register Web Pixel & Fix Shop Link"
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Web Pixel Registered Successfully</p>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Existing Pixels:</span> {result.existingPixels}
                </p>
                <p>
                  <span className="font-medium">Deleted Pixels:</span> {result.deletedPixels}
                </p>
                {result.newPixel && (
                  <p>
                    <span className="font-medium">New Pixel ID:</span> {result.newPixel.id}
                  </p>
                )}
                {result.pixelLinkFixed && (
                  <>
                    <p>
                      <span className="font-medium">Previous Pixel ID:</span> {result.previousPixelId}
                    </p>
                    <p>
                      <span className="font-medium">New Pixel ID:</span> {result.newPixelId}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
