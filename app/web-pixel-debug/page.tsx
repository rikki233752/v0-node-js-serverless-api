"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PixelData {
  timestamp: string
  shop?: string
  configAccountId?: string
  configData?: any
  analyticsData?: any
  detectedPixels?: string[]
}

export default function WebPixelDebugPage() {
  const [pixelData, setPixelData] = useState<PixelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/web-pixel-data")
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      const data = await response.json()
      setPixelData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Set up auto-refresh
    let intervalId: NodeJS.Timeout | null = null
    if (autoRefresh) {
      intervalId = setInterval(fetchData, 5000) // Refresh every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [autoRefresh])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Web Pixel Debug</h1>
        <div className="flex gap-2">
          <Button variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? "Loading..." : "Refresh Now"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {!pixelData && !loading && !error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No pixel data received yet. Please visit your Shopify store with the Web Pixel extension installed.
            </p>
          </CardContent>
        </Card>
      )}

      {pixelData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account ID Information</CardTitle>
              <CardDescription>The account ID is used to identify the Facebook Pixel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Configuration Account ID</h3>
                  <p className="font-mono text-lg">{pixelData.configAccountId || "Not set"}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Configuration Data Account ID</h3>
                  <p className="font-mono text-lg">{pixelData.configData?.accountID || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="config">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="detected">Detected Pixels</TabsTrigger>
            </TabsList>

            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Data</CardTitle>
                  <CardDescription>Full configuration object from the Web Pixel extension</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(pixelData.configData || {}, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Data</CardTitle>
                  <CardDescription>Analytics metadata from the Web Pixel extension</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(pixelData.analyticsData || {}, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detected">
              <Card>
                <CardHeader>
                  <CardTitle>Detected Pixels</CardTitle>
                  <CardDescription>Pixels detected on the page by the Web Pixel extension</CardDescription>
                </CardHeader>
                <CardContent>
                  {pixelData.detectedPixels && pixelData.detectedPixels.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-2">
                      {pixelData.detectedPixels.map((pixel, index) => (
                        <li key={index} className="font-mono">
                          {pixel}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No pixels detected</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Shop</h3>
                  <p className="font-mono">{pixelData.shop || "Unknown"}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Timestamp</h3>
                  <p className="font-mono">{pixelData.timestamp}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
