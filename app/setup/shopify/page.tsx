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
  const [shopUrl, setShopUrl] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill pixel ID from URL parameters
  useEffect(() => {
    const urlPixelId = searchParams.get("pixel_id") || searchParams.get("utm_pixel_id")
    if (urlPixelId) {
      setPixelId(urlPixelId)
    }
  }, [searchParams])

  const handleInstall = async () => {
    setLoading(true)
    setError(null)

    try {
      // Validate inputs
      if (!shopUrl.trim()) {
        setError("Please enter your store URL")
        return
      }

      if (!pixelId.trim()) {
        setError("Please enter your Facebook Pixel ID")
        return
      }

      // Clean and validate the shop URL
      let cleanShopUrl = shopUrl.trim().toLowerCase()

      // Remove protocol
      cleanShopUrl = cleanShopUrl.replace(/^https?:\/\//, "")

      // Remove trailing slash
      cleanShopUrl = cleanShopUrl.replace(/\/$/, "")

      // Check if it's a Shopify domain
      let shopDomain = cleanShopUrl
      if (!cleanShopUrl.includes(".myshopify.com")) {
        // Try to extract the Shopify subdomain from custom domains
        // This is a simplified approach - in production, you might want to verify this
        const parts = cleanShopUrl.split(".")
        if (parts.length >= 2) {
          shopDomain = `${parts[0]}.myshopify.com`
        } else {
          setError("Please enter a valid Shopify store URL")
          return
        }
      }

      // Validate pixel ID format (should be numeric)
      if (!/^\d+$/.test(pixelId)) {
        setError("Please enter a valid Facebook Pixel ID (numbers only)")
        return
      }

      // Store the pixel ID in session storage for the OAuth callback
      sessionStorage.setItem("pending_pixel_id", pixelId)
      sessionStorage.setItem("pending_shop_url", cleanShopUrl)

      // Generate the installation URL with pixel ID
      const response = await fetch(`/api/install?shop=${encodeURIComponent(shopDomain)}&pixel_id=${pixelId}`)
      const data = await response.json()

      if (data.success) {
        // Redirect to Shopify OAuth
        window.location.href = data.installUrl
      } else {
        setError(data.error || "Failed to generate installation URL")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
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
                <CardDescription>Connect your Facebook Pixel to your Shopify store</CardDescription>
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
                <Label htmlFor="shop-url">Store URL</Label>
                <Input
                  id="shop-url"
                  type="text"
                  placeholder="yourstore.myshopify.com or yourstore.com"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter your Shopify store URL (custom domain or .myshopify.com)
                </p>
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
                />
                <p className="text-sm text-gray-500 mt-1">Find this in your Facebook Events Manager</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>You'll be redirected to Shopify to approve the installation</li>
                <li>We'll automatically configure your Web Pixel</li>
                <li>Your events will start flowing through our gateway</li>
                <li>You can configure advanced settings in the admin panel</li>
              </ol>
            </div>

            <Button onClick={handleInstall} className="w-full" size="lg" disabled={loading}>
              {loading ? "Preparing Installation..." : "Continue to Shopify"}
            </Button>

            <div className="text-center text-sm text-gray-500">
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
