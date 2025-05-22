"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DebugPage() {
  const [envData, setEnvData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEnvData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/debug/env?debug=true")

      if (!response.ok) {
        throw new Error(`Failed to fetch environment data: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setEnvData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEnvData()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Environment Debug</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Current configuration for Shopify OAuth</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading environment data...</p>
          ) : error ? (
            <div className="text-red-500">
              <p>Error: {error}</p>
              <Button onClick={fetchEnvData} className="mt-2">
                Retry
              </Button>
            </div>
          ) : envData ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Environment:</h3>
                <p>{envData.environment}</p>
              </div>

              <div>
                <h3 className="font-semibold">Host from Request:</h3>
                <p>{envData.host_from_request}</p>
              </div>

              <div>
                <h3 className="font-semibold">SHOPIFY_API_KEY:</h3>
                <p>{envData.SHOPIFY_API_KEY}</p>
              </div>

              <div>
                <h3 className="font-semibold">SHOPIFY_API_SECRET:</h3>
                <p>{envData.SHOPIFY_API_SECRET}</p>
              </div>

              <div>
                <h3 className="font-semibold">SHOPIFY_SCOPES:</h3>
                <p>{envData.SHOPIFY_SCOPES}</p>
              </div>

              <div>
                <h3 className="font-semibold">HOST:</h3>
                <p>{envData.HOST}</p>
              </div>

              <div>
                <h3 className="font-semibold">Expected Redirect URI:</h3>
                <p>{envData.expected_redirect_uri}</p>
              </div>

              <div>
                <h3 className="font-semibold">Whitelisted Redirect URI:</h3>
                <p>{envData.whitelisted_redirect_uri}</p>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-red-500">Redirect URI Match:</h3>
                {envData.expected_redirect_uri === envData.whitelisted_redirect_uri ? (
                  <p className="text-green-500">✓ Redirect URIs match</p>
                ) : (
                  <p className="text-red-500">✗ Redirect URIs do not match</p>
                )}
              </div>
            </div>
          ) : (
            <p>No environment data available</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={fetchEnvData} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Data"}
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to Home
        </Button>
      </div>
    </div>
  )
}
