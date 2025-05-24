"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Loader2, Plus, Settings } from "lucide-react"

interface Shop {
  shopDomain: string
  gatewayEnabled: boolean
  pixelId: string | null
  pixelName: string | null
  configuredAt: string
  lastUpdated: string
}

export default function AdminConfigurePixels() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [configuring, setConfiguring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [shopDomain, setShopDomain] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [pixelName, setPixelName] = useState("")

  useEffect(() => {
    loadShops()
  }, [])

  const loadShops = async () => {
    try {
      const response = await fetch("/api/admin/configure-pixel")
      const data = await response.json()

      if (data.success) {
        setShops(data.shops)
      } else {
        setError(data.error || "Failed to load shops")
      }
    } catch (err) {
      setError("Failed to load shops")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConfiguring(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/configure-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain,
          pixelId,
          accessToken,
          pixelName: pixelName || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Pixel configured successfully for ${data.shopDomain}`)
        setShopDomain("")
        setPixelId("")
        setAccessToken("")
        setPixelName("")
        loadShops() // Reload the list
      } else {
        setError(data.error || "Failed to configure pixel")
      }
    } catch (err) {
      setError("An error occurred while configuring the pixel")
    } finally {
      setConfiguring(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configure Customer Pixels</h1>
        <p className="text-gray-600">Manage Facebook Pixel configurations for customer shops</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Pixel Configuration
            </CardTitle>
            <CardDescription>Configure Facebook Pixel for a customer shop</CardDescription>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="shopDomain">Shop Domain *</Label>
                <Input
                  id="shopDomain"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="customer-shop.myshopify.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pixelId">Facebook Pixel ID *</Label>
                <Input
                  id="pixelId"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="123456789012345"
                  required
                />
              </div>

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
              </div>

              <div className="space-y-2">
                <Label htmlFor="pixelName">Pixel Name (Optional)</Label>
                <Input
                  id="pixelName"
                  value={pixelName}
                  onChange={(e) => setPixelName(e.target.value)}
                  placeholder="Customer Store Pixel"
                />
              </div>

              <Button type="submit" disabled={configuring} className="w-full">
                {configuring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  "Configure Pixel"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Configured Shops List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configured Shops
            </CardTitle>
            <CardDescription>Currently configured customer shops</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : shops.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No shops configured yet</p>
            ) : (
              <div className="space-y-4">
                {shops.map((shop) => (
                  <div key={shop.shopDomain} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{shop.shopDomain}</h3>
                        <p className="text-sm text-gray-500">
                          {shop.pixelName || "Unnamed Pixel"} • {shop.pixelId}
                        </p>
                      </div>
                      <Badge variant={shop.pixelId ? "default" : "secondary"}>
                        {shop.pixelId ? "Configured" : "Pending"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400">
                      Configured: {new Date(shop.configuredAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
