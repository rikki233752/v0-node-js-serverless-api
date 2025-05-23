"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { XCircle, RefreshCw } from "lucide-react"

export default function ShopifyEventsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchShopifyEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const authHeader = sessionStorage.getItem("authHeader")
      const response = await fetch("/api/admin/logs?limit=50", {
        headers: {
          Authorization: authHeader || "",
        },
      })

      if (response.status === 401) {
        window.location.href = "/login?redirect=/admin/shopify-events"
        return
      }

      const data = await response.json()

      if (data.success) {
        // Filter for Shopify events
        const shopifyEvents = data.logs.filter((log: any) => {
          // Check if it's a Shopify event
          return (
            log.eventName.startsWith("shopify_") ||
            (log.payload && log.payload.includes("myshopify.com")) ||
            (log.payload && log.payload.includes("shop_domain"))
          )
        })

        setLogs(shopifyEvents)
      } else {
        setError(data.error || "Failed to fetch Shopify events")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShopifyEvents()
  }, [])

  // Parse the payload to extract shop domain and other details
  const parsePayload = (payload: string) => {
    try {
      const data = JSON.parse(payload)
      return data
    } catch (e) {
      return { error: "Invalid JSON" }
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shopify Events</h1>
        <Button onClick={fetchShopifyEvents} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shopify Event Logs</CardTitle>
          <CardDescription>Events received from your Shopify store via the Web Pixel Extension</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading Shopify events...</div>
          ) : logs.length === 0 ? (
            <Alert className="mb-4">
              <AlertTitle>No Shopify Events Found</AlertTitle>
              <AlertDescription>
                No events from Shopify have been recorded. This could indicate that your Shopify Web Pixel Extension is
                not properly configured or not sending events to the gateway.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const parsedPayload = log.payload ? parsePayload(log.payload) : {}
                    const shopDomain =
                      parsedPayload.shopDomain ||
                      (parsedPayload.eventData && JSON.parse(parsedPayload.eventData)?.custom_data?.shop_domain) ||
                      "unknown-shop"

                    return (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{shopDomain}</TableCell>
                        <TableCell>
                          {log.eventName.startsWith("shopify_") ? log.eventName.replace("shopify_", "") : log.eventName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <details>
                            <summary className="cursor-pointer text-sm text-blue-600">View Details</summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-40">
                              {JSON.stringify(parsedPayload, null, 2)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Troubleshooting Steps:</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Check Web Pixel Extension:</strong> Make sure the Shopify Web Pixel Extension is installed and
                  configured with the correct Pixel ID and Gateway URL.
                </li>
                <li>
                  <strong>Verify Gateway URL:</strong> The Gateway URL in your Shopify Web Pixel Extension should be:
                  <code className="mx-2 p-1 bg-gray-100 rounded">
                    {typeof window !== "undefined"
                      ? `${window.location.protocol}//${window.location.host}/api/track`
                      : "https://your-gateway-url.com/api/track"}
                  </code>
                </li>
                <li>
                  <strong>Enable Debug Mode:</strong> Set debug: true in your Web Pixel Extension settings to see
                  detailed logs in the browser console.
                </li>
                <li>
                  <strong>Check Browser Console:</strong> Visit your Shopify store and check the browser console for any
                  errors related to the Web Pixel Extension.
                </li>
                <li>
                  <strong>Test Manual Event:</strong> Use the Shopify Debug tool to send a test event from your Shopify
                  store.
                </li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
