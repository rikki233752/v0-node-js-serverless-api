"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function ShopifyPixelDebug() {
  const [shop, setShop] = useState("testforgateway-rikki.myshopify.com")
  const [accessToken, setAccessToken] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [databaseInfo, setDatabaseInfo] = useState<any>(null)
  const [webPixels, setWebPixels] = useState<any>(null)

  const checkDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/database")
      const data = await response.json()
      setDatabaseInfo(data)
      console.log("Database info:", data)
    } catch (error) {
      console.error("Database check failed:", error)
      setDatabaseInfo({ success: false, error: "Failed to check database" })
    } finally {
      setLoading(false)
    }
  }

  const manualRegister = async () => {
    if (!shop || !accessToken) {
      alert("Please enter both shop domain and access token")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/manual-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, accessToken }),
      })
      const data = await response.json()
      setResults(data)
      console.log("Manual registration result:", data)

      if (data.success) {
        await checkDatabase()
      }
    } catch (error) {
      console.error("Manual registration failed:", error)
      setResults({ success: false, error: "Registration failed" })
    } finally {
      setLoading(false)
    }
  }

  const checkWebPixels = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shopify/check-web-pixels?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()
      setWebPixels(data)
      console.log("Web Pixels check result:", data)
    } catch (error) {
      console.error("Web Pixels check failed:", error)
      setWebPixels({ success: false, error: "Failed to check Web Pixels" })
    } finally {
      setLoading(false)
    }
  }

  const activateWebPixel = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/shopify/activate-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      })
      const data = await response.json()
      setResults(data)
      console.log("Web Pixel activation result:", data)

      if (data.success) {
        // Refresh Web Pixels list
        await checkWebPixels()
      }
    } catch (error) {
      console.error("Web Pixel activation failed:", error)
      setResults({ success: false, error: "Web Pixel activation failed" })
    } finally {
      setLoading(false)
    }
  }

  const checkStoreCapabilities = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/shopify/store-capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      })
      const data = await response.json()
      setResults(data)
      console.log("Store capabilities:", data)
    } catch (error) {
      console.error("Store capabilities check failed:", error)
      setResults({ success: false, error: "Failed to check store capabilities" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Shopify Web Pixel Activation</h1>
        <p className="text-muted-foreground mt-2">Activate your Web Pixel extension using GraphQL</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Configuration</CardTitle>
          <CardDescription>Configure your Shopify store details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shop">Shopify Store Domain</Label>
            <Input
              id="shop"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="your-store.myshopify.com"
            />
          </div>
          <div>
            <Label htmlFor="accessToken">Access Token (for manual registration)</Label>
            <Input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Enter your Shopify access token"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database & Registration</CardTitle>
          <CardDescription>Check database status and register shop if needed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={checkDatabase} disabled={loading}>
              {loading ? "Checking..." : "Check Database"}
            </Button>
            <Button onClick={manualRegister} disabled={loading || !shop || !accessToken}>
              {loading ? "Registering..." : "Register Shop Manually"}
            </Button>
          </div>

          {databaseInfo && (
            <Alert variant={databaseInfo.success ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{databaseInfo.success ? "Database Connected" : "Database Error"}</AlertTitle>
              <AlertDescription>{databaseInfo.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Web Pixel Management</CardTitle>
          <CardDescription>Check and activate Web Pixel extensions using GraphQL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={checkWebPixels} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Checking..." : "Check Web Pixels"}
            </Button>
            <Button onClick={activateWebPixel} disabled={loading} variant="default">
              {loading ? "Activating..." : "Activate Web Pixel"}
            </Button>
          </div>

          {webPixels && (
            <div className="space-y-4">
              <Alert variant={webPixels.success ? "default" : "destructive"}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Web Pixels Status</AlertTitle>
                <AlertDescription>
                  {webPixels.success
                    ? `Found ${webPixels.count} Web Pixel(s)`
                    : `Error: ${webPixels.error || "Unknown error"}`}
                </AlertDescription>
              </Alert>

              {webPixels.success && webPixels.webPixels && webPixels.webPixels.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Active Web Pixels:</h4>
                  {webPixels.webPixels.map((pixel: any, index: number) => (
                    <div key={index} className="p-3 bg-muted rounded">
                      <p>
                        <strong>ID:</strong> {pixel.id}
                      </p>
                      <p>
                        <strong>Settings:</strong> {JSON.stringify(pixel.settings)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Analysis</CardTitle>
          <CardDescription>Check your store's capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkStoreCapabilities} disabled={loading}>
            {loading ? "Checking..." : "Check Store Capabilities"}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={JSON.stringify(results, null, 2)} readOnly className="min-h-[200px] font-mono text-sm" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How to use this tool</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal pl-5 space-y-1 mt-2">
                <li>First, check if your shop is in the database</li>
                <li>If not found, register it manually with an access token</li>
                <li>Check existing Web Pixels to see current status</li>
                <li>Click "Activate Web Pixel" to create a new Web Pixel using GraphQL</li>
                <li>Verify the Web Pixel was created successfully</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
