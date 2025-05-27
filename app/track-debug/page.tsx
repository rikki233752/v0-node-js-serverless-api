"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function TrackDebugPage() {
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [trackStatus, setTrackStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Check track API status on load
  useEffect(() => {
    checkTrackStatus()
  }, [])

  const checkTrackStatus = async () => {
    try {
      const response = await fetch("/api/debug/track-test")
      const data = await response.json()
      setTrackStatus(data)
    } catch (err) {
      console.error("Error checking track status:", err)
    }
  }

  const testDirectCall = async () => {
    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      // Test 1: Direct call to track API
      const trackResponse = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "TestEvent",
          event_time: Math.floor(Date.now() / 1000),
          shop_domain: "test-rikki-new.myshopify.com",
          pixel_id: "584928510540140",
          user_data: {
            client_user_agent: navigator.userAgent,
            em: "test@example.com",
            external_id: `test_${Date.now()}`,
          },
          custom_data: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        }),
      })

      const trackData = await trackResponse.json()

      // Test 2: Check if event was logged
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
      const statusResponse = await fetch("/api/debug/track-test")
      const statusData = await statusResponse.json()

      setTestResult({
        trackResponse: trackData,
        trackStatus: trackResponse.status,
        eventLogged: statusData.recentLogs.some((log: any) => log.eventName === "TestEvent_received"),
        recentLogs: statusData.recentLogs.slice(0, 5),
      })

      // Refresh track status
      checkTrackStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const testCORSCall = async () => {
    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      // Test with no-cors mode (simulating Web Pixel)
      const response = await fetch("https://v0-node-js-serverless-api-lake.vercel.app/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          event_name: "TestCORSEvent",
          event_time: Math.floor(Date.now() / 1000),
          shop_domain: "test-rikki-new.myshopify.com",
          pixel_id: "584928510540140",
          user_data: {
            client_user_agent: navigator.userAgent,
            external_id: `cors_test_${Date.now()}`,
          },
        }),
      })

      // With no-cors, we can't read the response
      setTestResult({
        message: "CORS test sent (no-cors mode prevents reading response)",
        note: "Check event logs to see if it was received",
      })

      // Refresh track status after a delay
      setTimeout(checkTrackStatus, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const testBeacon = async () => {
    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      const data = {
        event_name: "TestBeaconEvent",
        event_time: Math.floor(Date.now() / 1000),
        shop_domain: "test-rikki-new.myshopify.com",
        pixel_id: "584928510540140",
        user_data: {
          client_user_agent: navigator.userAgent,
          external_id: `beacon_test_${Date.now()}`,
        },
      }

      const blob = new Blob([JSON.stringify(data)], { type: "application/json" })
      const sent = navigator.sendBeacon("https://v0-node-js-serverless-api-lake.vercel.app/api/track", blob)

      setTestResult({
        beaconSent: sent,
        message: sent ? "Beacon sent successfully" : "Beacon failed to send",
        note: "Check event logs to see if it was received",
      })

      // Refresh track status after a delay
      setTimeout(checkTrackStatus, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Track API Debug</h1>

      {/* Current Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Track API Status</CardTitle>
          <CardDescription>Current state of the tracking system</CardDescription>
        </CardHeader>
        <CardContent>
          {trackStatus ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {trackStatus.serverStatus.databaseConnected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Database Connected</span>
              </div>
              <div className="flex items-center gap-2">
                {trackStatus.serverStatus.recentEventCount > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span>Recent Events: {trackStatus.serverStatus.recentEventCount}</span>
              </div>
              <div className="flex items-center gap-2">
                {trackStatus.analysis.isReceivingEvents ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Receiving Track API Calls: {trackStatus.analysis.isReceivingEvents ? "Yes" : "No"}</span>
              </div>
              {trackStatus.serverStatus.lastEventTime && (
                <div className="text-sm text-muted-foreground">
                  Last Event: {new Date(trackStatus.serverStatus.lastEventTime).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Loading status...</div>
          )}
          <Button onClick={checkTrackStatus} variant="outline" size="sm" className="mt-4">
            Refresh Status
          </Button>
        </CardContent>
      </Card>

      {/* Test Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Track API</CardTitle>
          <CardDescription>Test different methods of sending events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button onClick={testDirectCall} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Direct Call
            </Button>
            <Button onClick={testCORSCall} disabled={loading} variant="secondary">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test CORS Call
            </Button>
            <Button onClick={testBeacon} disabled={loading} variant="secondary">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test sendBeacon
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Test Result</AlertTitle>
              <AlertDescription>
                <pre className="text-xs mt-2">{JSON.stringify(testResult, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Logs */}
      {trackStatus?.recentLogs && trackStatus.recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Event Logs</CardTitle>
            <CardDescription>Last 5 events in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trackStatus.recentLogs.slice(0, 5).map((log: any) => (
                <div key={log.id} className="border rounded p-2 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{log.eventName}</span>
                      <span
                        className={`ml-2 text-xs px-2 py-1 rounded ${
                          log.status === "success"
                            ? "bg-green-100 text-green-800"
                            : log.status === "error"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.error && (
                    <div className="text-xs text-red-600 mt-1">
                      Error:{" "}
                      {typeof log.error === "object" ? log.error.message || JSON.stringify(log.error) : log.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
