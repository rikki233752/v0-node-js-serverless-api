"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function FixPixelConfigPage() {
  const [shopDomain, setShopDomain] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [configs, setConfigs] = useState<any[]>([])

  // Load all configurations
  const loadConfigs = async () => {
    try {
      const response = await fetch("/api/debug/pixel-config")
      const data = await response.json()
      if (data.success) {
        setConfigs(data.configs || [])
      }
    } catch (error) {
      console.error("Error loading configs:", error)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  const handleFix = async () => {
    if (!shopDomain || !pixelId) {
      setMessage("Please enter both shop domain and pixel ID")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      // First, ensure the pixel config exists
      const pixelResponse = await fetch("/api/customer/setup-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: shopDomain,
          pixelId: pixelId,
          accessToken: "", // Will use existing if available
        }),
      })

      const pixelData = await pixelResponse.json()

      if (pixelData.success) {
        setMessage(`✅ Successfully updated pixel configuration for ${shopDomain}`)
        loadConfigs() // Reload configurations
      } else {
        setMessage(`❌ Error: ${pixelData.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Fix Pixel Configuration</CardTitle>
          <CardDescription>Manually update the pixel ID for a shop</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop">Shop Domain</Label>
            <Input
              id="shop"
              type="text"
              placeholder="test-rikki-new.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixelId">Facebook Pixel ID</Label>
            <Input
              id="pixelId"
              type="text"
              placeholder="584928510540140"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
            />
          </div>

          <Button onClick={handleFix} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Pixel Configuration"
            )}
          </Button>

          {message && (
            <Alert className={message.startsWith("✅") ? "border-green-500" : "border-red-500"}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Configurations</CardTitle>
          <CardDescription>All shop configurations in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {configs.map((config) => (
              <div key={config.id} className="p-3 border rounded-lg">
                <div className="font-medium">{config.shopDomain}</div>
                <div className="text-sm text-gray-600">Pixel ID: {config.pixelConfig?.pixelId || "Not configured"}</div>
                <div className="text-sm text-gray-600">Gateway Enabled: {config.gatewayEnabled ? "Yes" : "No"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
