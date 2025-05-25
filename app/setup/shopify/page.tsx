"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, ShoppingBag, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ShopifySetupPage() {
  const searchParams = useSearchParams()
  const [shopDomain, setShopDomain] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [isInstalling, setIsInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill pixel ID from URL parameters
  useEffect(() => {
    const urlPixelId = searchParams.get("pixel_id") || searchParams.get("utm_pixel_id")
    if (urlPixelId) {
      setPixelId(urlPixelId)
      // Store in session storage to persist through OAuth flow
      sessionStorage.setItem("pixelId", urlPixelId)
    } else {
      // Check if we have a stored pixel ID from previous session
      const storedPixelId = sessionStorage.getItem("pixelId")
      if (storedPixelId) {
        setPixelId(storedPixelId)
      }
    }
  }, [searchParams])

  const normalizeShopifyDomain = (domain: string): string => {
    let normalizedDomain = domain.trim().toLowerCase()

    // Remove protocol if present
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, "")

    // Remove trailing slash if present
    normalizedDomain = normalizedDomain.replace(/\/$/, "")

    // If it's not a myshopify.com domain, add it
    if (!normalizedDomain.includes("myshopify.com")) {
      // Check if it's a subdomain or just a name
      if (normalizedDomain.includes(".")) {
        // It's likely a custom domain, try to convert to myshopify format
        // This is a best guess - the OAuth process will validate
        const parts = normalizedDomain.split(".")
        normalizedDomain = `${parts[0]}.myshopify.com`
      } else {
        // It's just a shop name
        normalizedDomain = `${normalizedDomain}.myshopify.com`
      }
    }

    return normalizedDomain
  }

  const handleInstall = async () => {
    setError(null)
    setIsInstalling(true)

    try {
      // Validate inputs
      if (!shopDomain.trim()) {
        throw new Error("Please enter your Shopify store URL")
      }

      if (!pixelId.trim()) {
        throw new Error("Please enter your Facebook Pixel ID")
      }

      // Validate pixel ID format
      if (!/^\d+$/.test(pixelId)) {
        throw new Error("Please enter a valid Facebook Pixel ID (numbers only)")
      }

      // Normalize the shop domain
      const normalizedDomain = normalizeShopifyDomain(shopDomain)

      // Store pixel ID in session storage to retrieve after OAuth
      sessionStorage.setItem("pixelId", pixelId)

      // Redirect to install endpoint with shop and pixel ID
      window.location.href = `/api/install?shop=${encodeURIComponent(normalizedDomain)}&pixelId=${encodeURIComponent(pixelId)}`
    } catch (error) {
      setError(error.message)
      setIsInstalling(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">Install on Shopify</CardTitle>
                <CardDescription>Connect your Shopify store with Facebook Pixel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="shop-domain">Shopify Store URL</Label>
                <Input
                  id="shop-domain"
                  type="text"
                  placeholder="yourstore.myshopify.com or custom domain"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  className="mt-1"
                  disabled={isInstalling}
                />
                <p className="text-sm text-gray-500 mt-1">Enter your .myshopify.com URL or your custom domain</p>
              </div>

              <div>
                <Label htmlFor="pixel-id">Facebook Pixel ID</Label>
                <Input
                  id="pixel-id"
                  type="text"
                  placeholder="e.g., 123456789012345"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  className="mt-1"
                  disabled={isInstalling}
                />
                <p className="text-sm text-gray-500 mt-1">Find this in your Facebook Events Manager</p>
              </div>
            </div>

            <Button onClick={handleInstall} className="w-full" size="lg" disabled={isInstalling}>
              {isInstalling ? "Installing..." : "Install on Shopify"}
            </Button>

            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              Need help? Check our{" "}
              <Link href="/integration-guide" className="text-blue-600 hover:underline">
                integration guide
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="text-blue-600 hover:underline">
                contact support
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
