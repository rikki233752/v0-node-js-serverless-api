"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react"

export default function ShopifyPixelDebug() {
  const [shop, setShop] = useState("test-rikki-new.myshopify.com")
  const [accessToken, setAccessToken] = useState("")
  const [accountID, setAccountID] = useState("facebook-pixel-gateway")
  const [pixelId, setPixelId] = useState("")
  const [gatewayUrl, setGatewayUrl] = useState("https://v0-node-js-serverless-api-lake.vercel.app/api/track")
  const [debug, setDebug] = useState(false)
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
    if (!pixelId) {
      alert("Please enter your Facebook Pixel ID")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/shopify/activate-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          accountID,
          pixelId,
          gatewayUrl,
          debug,
        }),
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Shopify Web Pixel Activation</h1>
        <p className="text-muted-foreground mt-2">Follow Shopify's official documentation to activate your Web Pixel</p>
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
          <CardTitle>Web Pixel Settings</CardTitle>
          <CardDescription>
            Configure the settings for your Web Pixel extension (as defined in shopify.extension.toml)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accountID">Account ID</Label>
            <Input
              id="accountID"
              value={accountID}
              onChange={(e) => setAccountID(e.target.value)}
              placeholder="facebook-pixel-gateway"
            />
            <p className="text-sm text-muted-foreground">
              This should match the accountID field in your extension settings
            </p>
          </div>
          <div>
            <Label htmlFor="pixelId">Facebook Pixel ID *</Label>
            <Input
              id="pixelId"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="Enter your Facebook Pixel ID"
              required
            />
            <p className="text-sm text-muted-foreground">Required: Your Facebook Pixel ID from Meta Business Manager</p>
          </div>
          <div>
            <Label htmlFor="gatewayUrl">Gateway URL</Label>
            <Input
              id="gatewayUrl"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="https://your-app.vercel.app/api/track"
            />
            <p className="text-sm text-muted-foreground">URL where pixel events will be sent</p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="debug" checked={debug} onCheckedChange={(checked) => setDebug(checked as boolean)} />
            <Label htmlFor="debug">Enable Debug Mode</Label>
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
          <CardDescription>
            Check and activate Web Pixel extensions using the official Shopify GraphQL mutation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={checkWebPixels} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Checking..." : "Check Web Pixels"}
            </Button>
            <Button onClick={activateWebPixel} disabled={loading || !pixelId} variant="default">
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

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.success && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                  {results.message}
                  <br />
                  <a
                    href={`https://${shop}/admin/settings/customer_events`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Check Customer Events in Shopify Admin <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </AlertDescription>
              </Alert>
            )}
            <Textarea value={JSON.stringify(results, null, 2)} readOnly className="min-h-[200px] font-mono text-sm" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>After Activation</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal pl-5 space-y-1 mt-2">
                <li>Go to your Shopify admin → Settings → Customer events</li>
                <li>Look for your app in the "App pixels" section</li>
                <li>It should show "Connected" status</li>
                <li>Test the pixel by making a test purchase</li>
                <li>Check Facebook Events Manager for incoming events</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
