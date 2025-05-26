"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export default function FixPixelConfigPage() {
  const [shopDomain, setShopDomain] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [selectedPixelConfigId, setSelectedPixelConfigId] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [configs, setConfigs] = useState<any[]>([])
  const [pixelConfigs, setPixelConfigs] = useState<any[]>([])

  // Load all configurations
  const loadConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/pixel-config")
      const data = await response.json()
      if (data.success) {
        setConfigs(data.configs || [])
        setPixelConfigs(data.allPixelConfigs || [])
      }
      setLoading(false)
    } catch (error) {
      console.error("Error loading configs:", error)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  const handleCreatePixel = async () => {
    if (!shopDomain || !pixelId) {
      setMessage("Please enter both shop domain and pixel ID")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      // Create or update pixel config
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
        setMessage(`✅ Successfully created/updated pixel configuration for ${shopDomain}`)
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

  const handleLinkPixel = async () => {
    if (!shopDomain || !selectedPixelConfigId) {
      setMessage("Please select both shop domain and pixel configuration")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      // Link shop to existing pixel config
      const response = await fetch(
        `/api/fix-pixel-link?shop=${encodeURIComponent(shopDomain)}&pixelConfigId=${encodeURIComponent(selectedPixelConfigId)}`,
      )
      const data = await response.json()

      if (data.success) {
        setMessage(`✅ Successfully linked ${shopDomain} to the selected pixel configuration`)
        loadConfigs() // Reload configurations
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Pixel Configuration Manager</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Pixel</CardTitle>
            <CardDescription>Create a new pixel configuration</CardDescription>
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

            <Button onClick={handleCreatePixel} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Pixel Configuration"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link Shop to Pixel</CardTitle>
            <CardDescription>Link a shop to an existing pixel configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkShop">Shop Domain</Label>
              <Input
                id="linkShop"
                type="text"
                placeholder="test-rikki-new.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixelConfig">Pixel Configuration</Label>
              <Select onValueChange={setSelectedPixelConfigId} value={selectedPixelConfigId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a pixel configuration" />
                </SelectTrigger>
                <SelectContent>
                  {pixelConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name} ({config.pixelId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleLinkPixel} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link Shop to Pixel"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {message && (
        <Alert className={`mt-6 ${message.startsWith("✅") ? "border-green-500" : "border-red-500"}`}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Shop Configurations</CardTitle>
          <CardDescription>All shop configurations in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {configs.map((config) => (
              <div key={config.id} className="p-4 border rounded-lg">
                <div className="font-medium text-lg">{config.shopDomain}</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Pixel Config ID:</span> {config.pixelConfigId || "Not configured"}
                  </div>
                  <div>
                    <span className="font-medium">Pixel ID:</span> {config.pixelConfig?.pixelId || "Not configured"}
                  </div>
                  <div>
                    <span className="font-medium">Pixel Name:</span> {config.pixelConfig?.name || "Not configured"}
                  </div>
                  <div>
                    <span className="font-medium">Gateway Enabled:</span> {config.gatewayEnabled ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Available Pixel Configurations</CardTitle>
          <CardDescription>All pixel configurations in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pixelConfigs.map((config) => (
              <div key={config.id} className="p-4 border rounded-lg">
                <div className="font-medium text-lg">{config.name}</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Config ID:</span> {config.id}
                  </div>
                  <div>
                    <span className="font-medium">Pixel ID:</span> {config.pixelId}
                  </div>
                  <div>
                    <span className="font-medium">Client ID:</span> {config.clientId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
