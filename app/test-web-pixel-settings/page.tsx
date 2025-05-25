"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TestWebPixelSettingsPage() {
  const [shopDomain, setShopDomain] = useState("test-rikki-new.myshopify.com")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/debug/test-web-pixel-settings?shop=${encodeURIComponent(shopDomain)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to test settings")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred")
      console.error("Error testing settings:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Test Web Pixel Settings</CardTitle>
          <CardDescription>Check the database configuration for a shop's Web Pixel settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="shopDomain">Shop Domain</Label>
            <div className="flex space-x-2">
              <Input
                id="shopDomain"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="your-shop.myshopify.com"
              />
              <Button onClick={testSettings} disabled={loading}>
                {loading ? "Testing..." : "Test Settings"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
              <h3 className="font-medium">Error</h3>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                <h3 className="font-medium text-green-800">Shop Found</h3>
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="font-medium">Domain:</span> {result.shop.domain}
                  </div>
                  <div>
                    <span className="font-medium">Access Token:</span> {result.shop.accessToken}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(result.shop.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div
                className={`border p-4 rounded-md ${result.shopConfig ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
              >
                <h3 className={`font-medium ${result.shopConfig ? "text-green-800" : "text-yellow-800"}`}>
                  Shop Config: {result.shopConfig ? "Found" : "Not Found"}
                </h3>
                {result.shopConfig && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="font-medium">ID:</span> {result.shopConfig.id}
                    </div>
                    <div>
                      <span className="font-medium">Pixel Config ID:</span>{" "}
                      {result.shopConfig.pixelConfigId || "Not set"}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span>{" "}
                      {new Date(result.shopConfig.updatedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`border p-4 rounded-md ${result.pixelConfig ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
              >
                <h3 className={`font-medium ${result.pixelConfig ? "text-green-800" : "text-yellow-800"}`}>
                  Pixel Config: {result.pixelConfig ? "Found" : "Not Found"}
                </h3>
                {result.pixelConfig && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="font-medium">ID:</span> {result.pixelConfig.id}
                    </div>
                    <div>
                      <span className="font-medium">Pixel ID:</span> {result.pixelConfig.pixelId}
                    </div>
                    <div>
                      <span className="font-medium">Pixel Name:</span> {result.pixelConfig.pixelName || "Not set"}
                    </div>
                    <div>
                      <span className="font-medium">Access Token:</span> {result.pixelConfig.accessToken}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span>{" "}
                      {new Date(result.pixelConfig.updatedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`border p-4 rounded-md ${result.webPixelSettings ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
              >
                <h3 className={`font-medium ${result.webPixelSettings ? "text-green-800" : "text-yellow-800"}`}>
                  Web Pixel Settings: {result.webPixelSettings ? "Found" : "Not Found"}
                </h3>
                {result.webPixelSettings && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="font-medium">ID:</span> {result.webPixelSettings.id}
                    </div>
                    <div>
                      <span className="font-medium">Web Pixel ID:</span> {result.webPixelSettings.webPixelId}
                    </div>
                    <div>
                      <span className="font-medium">Settings:</span>
                      <pre className="mt-1 bg-white p-2 rounded text-sm overflow-auto max-h-40">
                        {JSON.stringify(result.webPixelSettings.settings, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span>{" "}
                      {new Date(result.webPixelSettings.updatedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <a href="/web-pixel-debug" className="text-blue-600 hover:underline">
            Go to Web Pixel Debug Page
          </a>
        </CardFooter>
      </Card>
    </div>
  )
}
