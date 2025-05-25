"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function CustomerSetup() {
  const [shop, setShop] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [pixelName, setPixelName] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [pixelExists, setPixelExists] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Get shop from URL params or cookies
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shopParam = urlParams.get("shop")

    if (shopParam) {
      setShop(shopParam)
      checkConfiguration(shopParam)
    } else {
      // Try to get from cookie
      const shopCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("shopify_shop="))
        ?.split("=")[1]

      if (shopCookie) {
        setShop(shopCookie)
        checkConfiguration(shopCookie)
      } else {
        setChecking(false)
        setError("Shop not found. Please install the app first.")
      }
    }
  }, [])

  const checkConfiguration = async (shopDomain: string) => {
    try {
      const response = await fetch(`/api/customer/setup-pixel?shop=${shopDomain}`)
      const data = await response.json()

      if (data.success) {
        setConfigured(data.configured)
        if (data.configured) {
          setPixelId(data.pixelId)
          setPixelName(data.pixelName)
        }
      }

      // Check if the pixel ID exists in the database
      const pixelResponse = await fetch(`/api/customer/check-pixel?pixelId=${pixelId}`)
      const pixelData = await pixelResponse.json()
      setPixelExists(pixelData.exists)
    } catch (err) {
      console.error("Error checking configuration:", err)
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/customer/setup-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          pixelId,
          accessToken: pixelExists ? undefined : accessToken, // Only send access token if pixel doesn't exist
          pixelName: pixelName || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess("Facebook Pixel configured successfully! Tracking is now active.")
        setConfigured(true)
      } else {
        setError(data.error || "Failed to configure pixel")
      }
    } catch (err) {
      setError("An error occurred while configuring the pixel")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {configured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            Facebook Pixel Gateway Setup
          </CardTitle>
          <CardDescription>
            {configured
              ? "Your Facebook Pixel is configured and tracking events."
              : "Configure your Facebook Pixel to start tracking events from your Shopify store."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configured ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Configuration Complete!</strong>
                  <br />
                  Pixel ID: {pixelId}
                  <br />
                  Name: {pixelName}
                  <br />
                  Shop: {shop}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-semibold">What's Next?</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Your Facebook Pixel is now tracking events from your store</li>
                  <li>Check Facebook Events Manager to see incoming events</li>
                  <li>Events include: Page Views, Add to Cart, Purchases, and more</li>
                </ul>
              </div>

              <Button
                onClick={() => {
                  setConfigured(false)
                  setPixelId("")
                  setAccessToken("")
                  setPixelName("")
                }}
                variant="outline"
              >
                Reconfigure Pixel
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="shop">Shop Domain</Label>
                <Input
                  id="shop"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  placeholder="your-shop.myshopify.com"
                  required
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pixelId">Facebook Pixel ID *</Label>
                <Input
                  id="pixelId"
                  value={pixelId}
                  onChange={(e) => {
                    setPixelId(e.target.value)
                    // Check if pixel exists when ID changes
                    if (e.target.value) {
                      fetch(`/api/customer/check-pixel?pixelId=${e.target.value}`)
                        .then((res) => res.json())
                        .then((data) => setPixelExists(data.exists))
                        .catch(() => setPixelExists(false))
                    } else {
                      setPixelExists(false)
                    }
                  }}
                  placeholder="123456789012345"
                  required
                />
                <p className="text-sm text-gray-500">Find this in your Facebook Events Manager</p>
              </div>

              {!pixelExists && (
                <div className="space-y-2">
                  <Label htmlFor="accessToken">Facebook Access Token *</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAABsbCc1234567890..."
                    required
                  />
                  <p className="text-sm text-gray-500">Generate this in Facebook Business Manager</p>
                </div>
              )}

              {pixelExists && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    This Pixel ID is already registered in our system. No access token needed.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="pixelName">Pixel Name (Optional)</Label>
                <Input
                  id="pixelName"
                  value={pixelName}
                  onChange={(e) => setPixelName(e.target.value)}
                  placeholder="My Store Pixel"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  "Configure Facebook Pixel"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
