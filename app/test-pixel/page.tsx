"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function TestPixel() {
  const [pixelId, setPixelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkPixel = async () => {
    if (!pixelId) {
      setError("Please enter a Pixel ID")
      return
    }

    setLoading(true)
    setError(null)
    setCheckResult(null)
    setTestResult(null)

    try {
      const response = await fetch(`/api/test-pixel?pixelId=${pixelId}`)
      const data = await response.json()

      if (response.ok) {
        setCheckResult(data)
      } else {
        setError(data.error || "Failed to check pixel")
      }
    } catch (err) {
      setError("An error occurred while checking the pixel")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const sendTestEvent = async () => {
    if (!pixelId) {
      setError("Please enter a Pixel ID")
      return
    }

    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      const response = await fetch("/api/test-pixel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixelId,
          eventName: "TestEvent",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult(data)
        // Refresh the check result to get updated logs
        checkPixel()
      } else {
        setTestResult(data)
        setError(data.error || "Failed to send test event")
      }
    } catch (err) {
      setError("An error occurred while sending the test event")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Facebook Pixel Test Tool</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Your Pixel Configuration</CardTitle>
          <CardDescription>
            Enter your Facebook Pixel ID to check if it's properly configured and send a test event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Enter your Pixel ID (e.g., 123456789012345)"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
            />
            <Button onClick={checkPixel} disabled={loading}>
              {loading ? "Checking..." : "Check Pixel"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {checkResult && (
            <div className="mt-4">
              <Alert variant={checkResult.success ? "default" : "destructive"}>
                {checkResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{checkResult.success ? "Pixel Found" : "Pixel Not Found"}</AlertTitle>
                <AlertDescription>
                  {checkResult.success
                    ? `Pixel "${checkResult.pixel.name}" is properly configured in the gateway.`
                    : "The pixel ID was not found in the gateway database."}
                </AlertDescription>
              </Alert>

              {checkResult.success && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Pixel Details:</h3>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p>
                      <strong>Name:</strong> {checkResult.pixel.name}
                    </p>
                    <p>
                      <strong>Pixel ID:</strong> {checkResult.pixel.pixelId}
                    </p>
                    <p>
                      <strong>Access Token:</strong> {checkResult.pixel.accessToken}
                    </p>
                    {checkResult.pixel.clientId && (
                      <p>
                        <strong>Client ID:</strong> {checkResult.pixel.clientId}
                      </p>
                    )}
                    <p>
                      <strong>Added:</strong> {new Date(checkResult.pixel.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <Button onClick={sendTestEvent} disabled={loading}>
                      {loading ? "Sending..." : "Send Test Event"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {testResult && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Test Event Result:</h3>
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{testResult.success ? "Test Event Sent Successfully" : "Test Event Failed"}</AlertTitle>
                <AlertDescription>
                  {testResult.success
                    ? "The test event was successfully sent to Facebook's Conversions API."
                    : "Failed to send the test event to Facebook's Conversions API."}
                </AlertDescription>
              </Alert>

              {testResult.meta_response && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-1">Facebook API Response:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(testResult.meta_response, null, 2)}
                  </pre>
                </div>
              )}

              {testResult.details && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-1">Error Details:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
        {checkResult && checkResult.success && checkResult.recentLogs && checkResult.recentLogs.length > 0 && (
          <CardFooter className="flex-col items-start">
            <h3 className="text-lg font-semibold mb-2">Recent Event Logs:</h3>
            <div className="w-full">
              {checkResult.recentLogs.map((log: any) => (
                <div key={log.id} className="flex justify-between items-center border-b py-2">
                  <div>
                    <span className="font-medium">{log.eventName}</span>
                    <span className="text-sm text-gray-500 ml-2">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                </div>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Pixel Not Found</h3>
              <p>
                If your pixel is not found in the database, make sure you've added it through the admin dashboard or
                API. Go to the{" "}
                <a href="/admin/dashboard" className="text-blue-600 hover:underline">
                  Admin Dashboard
                </a>{" "}
                to add your pixel.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Test Event Failed</h3>
              <p>Common reasons for test event failures:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Invalid access token (check if it's expired or has the correct permissions)</li>
                <li>Incorrect pixel ID</li>
                <li>Network connectivity issues</li>
                <li>Facebook API rate limits or temporary outages</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">No Logs Appearing</h3>
              <p>
                If events are being sent but no logs appear, there might be an issue with the database connection or the
                logging functionality. Check your server logs for more details.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Client-Side Implementation</h3>
              <p>
                To verify your client-side implementation, add the following code to your website and check if events
                are being sent to the gateway:
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs mt-2">
                {`// Test the gateway connection
fetch('${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : window.location.origin}/api/track', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    pixelId: '${pixelId || "YOUR_PIXEL_ID"}',
    event_name: 'TestEvent',
    user_data: {
      client_user_agent: navigator.userAgent
    }
  })
})`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
