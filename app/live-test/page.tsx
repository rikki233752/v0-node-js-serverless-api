"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Send, Eye } from "lucide-react"

export default function LiveTest() {
  const [pixelId, setPixelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendTestEvent = async () => {
    if (!pixelId) {
      setError("Please enter a Pixel ID")
      return
    }

    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      // Send a more complete test event
      const response = await fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixelId: pixelId,
          event_name: "Purchase", // Use a standard event name
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: window.location.href,
          user_data: {
            client_user_agent: navigator.userAgent,
            client_ip_address: "127.0.0.1", // This will be replaced by server
            em: "test@example.com", // This will be hashed
            ph: "1234567890", // This will be hashed
          },
          custom_data: {
            currency: "USD",
            value: 99.99,
            content_type: "product",
            content_ids: ["test-product-123"],
            content_name: "Test Product",
            num_items: 1,
            order_id: `test-order-${Date.now()}`,
          },
          // Remove test_event_code to send as live event
          // test_event_code: "TEST12345",
        }),
      })

      const data = await response.json()
      setTestResult(data)

      if (!data.success) {
        setError(data.error || "Test failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const checkRecentLogs = async () => {
    try {
      const authHeader = sessionStorage.getItem("authHeader")
      const response = await fetch(`/api/admin/logs?pixelId=${pixelId}&limit=5`, {
        headers: {
          Authorization: authHeader || "",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Recent logs for pixel:", data)
        // You could display these logs in the UI
      }
    } catch (err) {
      console.error("Failed to fetch recent logs:", err)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Live Event Test</h1>
        <Button variant="outline" onClick={() => (window.location.href = "/system-test")}>
          Back to System Test
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Send Test Event</CardTitle>
          <CardDescription>Send a real event to your Facebook Pixel to test the complete flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pixelId">Facebook Pixel ID</Label>
              <Input
                id="pixelId"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="123456789012345"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the Pixel ID you want to test. Make sure it's configured in your admin dashboard.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={sendTestEvent} disabled={loading || !pixelId} className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {loading ? "Sending..." : "Send Test Event"}
              </Button>

              {pixelId && (
                <Button variant="outline" onClick={checkRecentLogs} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View Recent Logs
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "Success" : "Failed"}
                </Badge>
              </div>

              {testResult.success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Event Sent Successfully!</AlertTitle>
                  <AlertDescription>
                    Your event was successfully sent to Facebook's Conversions API. Event ID: {testResult.event_id}
                  </AlertDescription>
                </Alert>
              )}

              <details>
                <summary className="cursor-pointer font-medium">View Full Response</summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </details>

              {testResult.success && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Next Steps:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Check your Facebook Events Manager to see if the event appears</li>
                    <li>Verify the event data matches what you sent</li>
                    <li>Test with real user data from your website</li>
                    <li>Monitor the admin logs for any issues</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Testing Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pixel-configured" />
              <label htmlFor="pixel-configured" className="text-sm">
                Pixel ID and Access Token are configured in admin dashboard
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="test-event-sent" />
              <label htmlFor="test-event-sent" className="text-sm">
                Test event sent successfully
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="facebook-events-manager" />
              <label htmlFor="facebook-events-manager" className="text-sm">
                Event appears in Facebook Events Manager
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="client-integration" />
              <label htmlFor="client-integration" className="text-sm">
                Client-side script is installed on your website
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="real-events" />
              <label htmlFor="real-events" className="text-sm">
                Real events are flowing from your website
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
