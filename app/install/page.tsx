"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function InstallPage() {
  const [shop, setShop] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!shop) {
      setError("Shop domain is required")
      return
    }

    // Add .myshopify.com if not included
    let shopDomain = shop
    if (!shopDomain.includes(".myshopify.com")) {
      shopDomain = `${shopDomain}.myshopify.com`
    }

    setIsLoading(true)

    try {
      // Redirect to the auth endpoint
      window.location.href = `/api/auth?shop=${encodeURIComponent(shopDomain)}`
    } catch (err) {
      setError("Failed to initiate installation")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Install Facebook Pixel Gateway</CardTitle>
          <CardDescription>
            Connect your Shopify store to start sending events to Facebook Conversions API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleInstall}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="shop" className="text-sm font-medium">
                  Shopify Store Domain
                </label>
                <Input
                  id="shop"
                  placeholder="your-store.myshopify.com"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleInstall} disabled={isLoading}>
            {isLoading ? "Installing..." : "Install App"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
