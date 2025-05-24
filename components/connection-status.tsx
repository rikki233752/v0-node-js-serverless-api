"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw, Settings } from "lucide-react"
import { getShopFromUrl } from "@/lib/shopify-utils"

interface ConnectionStatus {
  connected: boolean
  installed: boolean
  message: string
  shop?: string
  error?: string
}

export function ConnectionStatus() {
  const [shop, setShop] = useState<string | null>(null)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const shopFromUrl = getShopFromUrl()
    setShop(shopFromUrl)
    if (shopFromUrl) {
      checkConnectionStatus(shopFromUrl)
    }
  }, [])

  const checkConnectionStatus = async (shopDomain: string) => {
    try {
      setChecking(true)
      const response = await fetch(`/api/connection-status?shop=${encodeURIComponent(shopDomain)}`)
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        connected: false,
        installed: false,
        message: "Failed to check connection status",
        error: error.message,
      })
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }

  const handleReconnect = () => {
    if (shop) {
      // Redirect to OAuth flow
      window.location.href = `/api/auth?shop=${encodeURIComponent(shop)}`
    }
  }

  const handleConfigurePixel = () => {
    if (shop) {
      window.location.href = `/admin/dashboard?shop=${encodeURIComponent(shop)}`
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Checking connection status...
        </CardContent>
      </Card>
    )
  }

  if (!shop) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">No Shop Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Unable to determine which Shopify store this installation is for.</p>
          <Button className="mt-4" onClick={() => (window.location.href = "/")}>
            Return to Home
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status?.connected ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          {status?.connected ? "Connected Successfully!" : "Connection Issue"}
        </CardTitle>
        <CardDescription>
          Facebook Pixel Gateway for <strong>{shop}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Installation Successful</AlertTitle>
            <AlertDescription>
              Your app is properly connected and ready to track Facebook Pixel events.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Connection Problem</AlertTitle>
            <AlertDescription>
              {status?.message || "The app is not properly connected to your store."}
              {status?.error && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Technical Details</summary>
                  <pre className="text-xs mt-1 p-2 bg-gray-100 rounded">{status.error}</pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {status?.connected ? (
            <>
              <Button onClick={handleConfigurePixel} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Configure Facebook Pixel
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = `/shopify-pixel-debug?shop=${encodeURIComponent(shop)}`)}
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Debug Web Pixel
              </Button>
              <Button
                variant="outline"
                onClick={() => checkConnectionStatus(shop)}
                disabled={checking}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Checking..." : "Refresh Status"}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleReconnect} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect App
              </Button>
              <Button
                variant="outline"
                onClick={() => checkConnectionStatus(shop)}
                disabled={checking}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Checking..." : "Check Again"}
              </Button>
            </>
          )}
        </div>

        <div className="pt-4 border-t text-sm text-gray-600">
          <p>
            <strong>Next Steps:</strong>
          </p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Configure your Facebook Pixel ID and Access Token</li>
            <li>Test the pixel connection</li>
            <li>Monitor events in the admin dashboard</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
