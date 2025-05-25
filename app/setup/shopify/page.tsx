"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, ArrowRight, Store } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export default function ShopifySetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [shopUrl, setShopUrl] = useState("")
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

    if (!shopUrl) {
      setError("Please enter your Shopify store URL")
      return
    }

    if (!pixelId) {
      setError("Please enter your Facebook Pixel ID")
      return
    }

    setIsLoading(true)

    try {
      // Clean up the shop URL to ensure it's in the correct format
      let cleanShopUrl = shopUrl.trim().toLowerCase()

      // Remove protocol if present
      cleanShopUrl = cleanShopUrl.replace(/^https?:\/\//, "")

      // Remove trailing slash if present
      cleanShopUrl = cleanShopUrl.replace(/\/$/, "")

      // If it doesn't end with myshopify.com, add it
      if (!cleanShopUrl.endsWith(".myshopify.com")) {
        // Check if it's a custom domain or missing the myshopify.com part
        if (cleanShopUrl.includes(".")) {
          // It's likely a custom domain, we need to convert it to myshopify format
          // Store this in session storage for later use
          sessionStorage.setItem("originalShopDomain", cleanShopUrl)

          // For now, we'll show an error and ask for myshopify.com domain
          setError("Please enter your .myshopify.com URL. Custom domains are not supported for installation.")
          setIsLoading(false)
          return
        } else {
          // It's missing the myshopify.com part
          cleanShopUrl = `${cleanShopUrl}.myshopify.com`
        }
      }

      // Store the pixel ID in session storage to persist through OAuth
      sessionStorage.setItem("pixelId", pixelId)

      // Redirect to the install endpoint
      window.location.href = `/api/install?shop=${encodeURIComponent(cleanShopUrl)}&pixelId=${encodeURIComponent(pixelId)}`
    } catch (err) {
      console.error("Installation error:", err)
      setError("An error occurred during installation. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-md">
      <h1 className="text-3xl font-bold text-center mb-8">Connect Your Shopify Store</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Shopify Installation
          </CardTitle>
          <CardDescription>Connect your Shopify store to start tracking Facebook Pixel events</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                You'll need to have admin access to your Shopify store and your Facebook Pixel ID ready.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="shopUrl">Shopify Store URL</Label>
              <Input
                id="shopUrl"
                placeholder="your-store.myshopify.com"
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">Enter your .myshopify.com URL, not your custom domain</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixelId">Facebook Pixel ID</Label>
              <Input
                id="pixelId"
                placeholder="123456789012345"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">Find this in your Facebook Business Manager under Events Manager</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
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
        </form>
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
