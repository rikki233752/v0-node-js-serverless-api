"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export default function ShopifySetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [shopDomain, setShopDomain] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for UTM parameters
  useEffect(() => {
    const utmPixelId = searchParams.get("utm_pixel_id") || searchParams.get("pixel_id")
    if (utmPixelId) {
      setPixelId(utmPixelId)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate inputs
      if (!shopDomain) {
        throw new Error("Please enter your Shopify store domain")
      }

      // Clean up the shop domain to ensure it's in the correct format
      let cleanShopDomain = shopDomain.trim().toLowerCase()

      // Remove protocol if present
      cleanShopDomain = cleanShopDomain.replace(/^https?:\/\//, "")

      // Add myshopify.com if not present and not a custom domain
      if (!cleanShopDomain.includes(".myshopify.com") && !cleanShopDomain.includes(".")) {
        cleanShopDomain = `${cleanShopDomain}.myshopify.com`
      }

      // Store the pixel ID in session storage to persist through OAuth
      sessionStorage.setItem("pixelId", pixelId)

      // Construct the installation URL
      const installUrl = `/api/install?shop=${encodeURIComponent(cleanShopDomain)}${
        pixelId ? `&pixelId=${encodeURIComponent(pixelId)}` : ""
      }`

      // Redirect to the install endpoint
      window.location.href = installUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Shopify Installation</CardTitle>
          <CardDescription>Connect your Shopify store to start tracking Facebook Pixel events</CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-1">
                Shopify Store Domain
              </label>
              <Input
                id="shopDomain"
                placeholder="your-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter your .myshopify.com URL, not your custom domain</p>
            </div>

            <div>
              <label htmlFor="pixelId" className="block text-sm font-medium text-gray-700 mb-1">
                Facebook Pixel ID (Optional)
              </label>
              <Input
                id="pixelId"
                placeholder="123456789012345"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in your Facebook Business Manager under Events Manager. You can also add this later.
              </p>
            </div>
          </form>
        </CardContent>

        <CardFooter>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Installing...
              </>
            ) : (
              <>
                Install App
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Not using Shopify?{" "}
          <a href="/setup/website" className="text-blue-600 hover:underline">
            Set up for any website
          </a>
        </p>
      </div>
    </div>
  )
}
