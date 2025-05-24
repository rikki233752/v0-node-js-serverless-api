"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function WebPixelDebugPage() {
  const [pixelData, setPixelData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string>("")

  const fetchPixelData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/debug/web-pixel-data", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      setPixelData(data)
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (err: any) {
      setError(err.message || "Failed to fetch pixel data")
      console.error("Error fetching pixel data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPixelData()

    // Set up polling every 5 seconds
    const intervalId = setInterval(fetchPixelData, 5000)

    return () => clearInterval(intervalId)
  }, [])

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2)
  }

  const getAccountId = () => {
    if (!pixelData || !pixelData.data) return "Not available"

    const configAccountId = pixelData.data.configAccountId || "Not found"
    const configData = pixelData.data.configData?.accountID || "Not found in configData"

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold">configAccountId:</span>
          <span
            className={`px-2 py-1 rounded ${configAccountId !== "Not found" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {configAccountId}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold">configData.accountID:</span>
          <span
            className={`px-2 py-1 rounded ${configData !== "Not found in configData" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {configData}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Web Pixel Debug Data</CardTitle>
          <CardDescription>Shows the latest data received from the Web Pixel extension</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !pixelData ? (
            <div className="text-center py-8">Loading pixel data...</div>
          ) : error ? (
            <div className="bg-red-100 text-red-800 p-4 rounded">Error: {error}</div>
          ) : !pixelData || !pixelData.data ? (
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded">
              No pixel data received yet. Please visit your Shopify store with the Web Pixel extension installed.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-2">Account ID Information</h3>
                {getAccountId()}
              </div>

              <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Timestamp</h3>
                      <p>{pixelData.timestamp}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Current URL</h3>
                      <p className="break-all">{pixelData.data?.currentUrl || "Not available"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Detected Pixels</h3>
                      {pixelData.data?.detectedPixels?.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {pixelData.data.detectedPixels.map((pixel: string, index: number) => (
                            <li key={index}>{pixel}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No pixels detected</p>
                      )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">User Agent</h3>
                      <p className="text-sm break-all">{pixelData.data?.userAgent || "Not available"}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="config">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Configuration Data</h3>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
                      {formatJson(pixelData.data?.configData || {})}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="analytics">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Analytics Data</h3>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
                      {formatJson(pixelData.data?.analyticsData || {})}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="raw">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Raw Data</h3>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
                      {formatJson(pixelData)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div className="text-sm text-gray-500">Last refreshed: {lastRefresh || "Never"}</div>
          <Button onClick={fetchPixelData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
