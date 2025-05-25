"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw, Info, AlertTriangle } from "lucide-react"

interface WebPixelData {
  timestamp: string
  shop?: string
  configAccountId?: string
  configData?: any
  analyticsData?: any
  detectedPixels?: string[]
}

export default function WebPixelDebugPage() {
  const [data, setData] = useState<WebPixelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/debug/web-pixel-data")
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Web Pixel Debug</h1>

      <div className="mb-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Debug Information</AlertTitle>
          <AlertDescription>
            This page shows data received from the Web Pixel extension. Visit your Shopify store with the extension
            installed to see data.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Latest Data</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!data ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <h3 className="text-lg font-medium mb-2">No pixel data received yet</h3>
              <p className="text-gray-500">Please visit your Shopify store with the Web Pixel extension installed.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Account ID Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account ID Information</CardTitle>
              <CardDescription>The pixel ID being used by the Web Pixel extension</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium">Config Account ID:</div>
                  <div className="col-span-2">{data.configAccountId || "Not set"}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium">Config Data Account ID:</div>
                  <div className="col-span-2">{data.configData?.accountID || "Not set"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Data */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Data</CardTitle>
              <CardDescription>Full configuration object from the Web Pixel</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(data.configData || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Analytics Data */}
          <Card>
            <CardHeader>
              <CardTitle>Analytics Data</CardTitle>
              <CardDescription>Analytics metadata from the Web Pixel</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(data.analyticsData || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Detected Pixels */}
          <Card>
            <CardHeader>
              <CardTitle>Detected Pixels</CardTitle>
              <CardDescription>Pixels detected on the page</CardDescription>
            </CardHeader>
            <CardContent>
              {data.detectedPixels && data.detectedPixels.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {data.detectedPixels.map((pixel, index) => (
                    <li key={index}>{pixel}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No pixels detected</p>
              )}
            </CardContent>
          </Card>

          {/* Timestamp */}
          <div className="text-sm text-gray-500 text-right">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
