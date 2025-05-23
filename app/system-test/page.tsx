"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Database, Zap, Globe } from "lucide-react"

interface TestResult {
  name: string
  status: "success" | "error" | "warning" | "pending"
  message: string
  details?: any
}

export default function SystemTest() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [overallStatus, setOverallStatus] = useState<"success" | "error" | "warning" | "pending">("pending")

  const updateTest = (name: string, status: TestResult["status"], message: string, details?: any) => {
    setTests((prev) => {
      const existing = prev.find((t) => t.name === name)
      const newTest = { name, status, message, details }

      if (existing) {
        return prev.map((t) => (t.name === name ? newTest : t))
      } else {
        return [...prev, newTest]
      }
    })
  }

  const runSystemTests = async () => {
    setLoading(true)
    setTests([])
    setOverallStatus("pending")

    try {
      // Test 1: Database Connection
      updateTest("Database Connection", "pending", "Testing database connection...")

      try {
        const dbResponse = await fetch("/api/db-status")
        const dbData = await dbResponse.json()

        if (dbData.success) {
          updateTest(
            "Database Connection",
            "success",
            `Connected successfully. ${dbData.stats.pixelConfigs} pixels, ${dbData.stats.eventLogs} events`,
            dbData,
          )
        } else {
          updateTest("Database Connection", "error", `Database connection failed: ${dbData.error}`, dbData)
        }
      } catch (error) {
        updateTest(
          "Database Connection",
          "error",
          `Database test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }

      // Test 2: Admin API Access
      updateTest("Admin API", "pending", "Testing admin API access...")

      try {
        const authHeader = sessionStorage.getItem("authHeader")
        const adminResponse = await fetch("/api/admin/pixels", {
          headers: {
            Authorization: authHeader || "",
          },
        })

        if (adminResponse.ok) {
          const adminData = await adminResponse.json()
          updateTest(
            "Admin API",
            "success",
            `Admin API accessible. Found ${adminData.pixels?.length || 0} configured pixels`,
            adminData,
          )
        } else {
          updateTest("Admin API", "error", `Admin API failed: ${adminResponse.status} ${adminResponse.statusText}`)
        }
      } catch (error) {
        updateTest(
          "Admin API",
          "error",
          `Admin API test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }

      // Test 3: Tracking API
      updateTest("Tracking API", "pending", "Testing tracking API endpoint...")

      try {
        const trackingResponse = await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pixelId: process.env.NEXT_PUBLIC_TEST_PIXEL_ID || "123456789012345",
            event_name: "SystemTest",
            user_data: {
              client_user_agent: navigator.userAgent,
            },
            custom_data: {
              test: true,
              timestamp: Date.now(),
            },
          }),
        })

        const trackingData = await trackingResponse.json()

        if (trackingData.success) {
          updateTest("Tracking API", "success", "Tracking API is working correctly", trackingData)
        } else {
          updateTest(
            "Tracking API",
            "warning",
            `Tracking API responded but may have issues: ${trackingData.error}`,
            trackingData,
          )
        }
      } catch (error) {
        updateTest(
          "Tracking API",
          "error",
          `Tracking API test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }

      // Test 4: Environment Variables
      updateTest("Environment Variables", "pending", "Checking environment variables...")

      try {
        const envResponse = await fetch("/api/debug/env?debug=true")
        const envData = await envResponse.json()

        const requiredVars = [
          { name: "SHOPIFY_API_KEY", value: envData.SHOPIFY_API_KEY },
          { name: "HOST", value: envData.HOST },
          { name: "SHOPIFY_SCOPES", value: envData.SHOPIFY_SCOPES },
        ]

        const missingVars = requiredVars.filter((v) => v.value === "Not set")

        if (missingVars.length === 0) {
          updateTest("Environment Variables", "success", "All required environment variables are set", envData)
        } else {
          updateTest(
            "Environment Variables",
            "warning",
            `Missing variables: ${missingVars.map((v) => v.name).join(", ")}`,
            envData,
          )
        }
      } catch (error) {
        updateTest(
          "Environment Variables",
          "error",
          `Environment check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }

      // Test 5: Recent Event Logs
      updateTest("Event Logs", "pending", "Checking for recent event activity...")

      try {
        const authHeader = sessionStorage.getItem("authHeader")
        const logsResponse = await fetch("/api/admin/logs?limit=10", {
          headers: {
            Authorization: authHeader || "",
          },
        })

        if (logsResponse.ok) {
          const logsData = await logsResponse.json()
          const recentLogs = logsData.logs || []
          const last24Hours = recentLogs.filter((log: any) => {
            const logTime = new Date(log.createdAt).getTime()
            const now = Date.now()
            return now - logTime < 24 * 60 * 60 * 1000 // 24 hours
          })

          if (last24Hours.length > 0) {
            updateTest("Event Logs", "success", `Found ${last24Hours.length} events in the last 24 hours`, {
              recentLogs: last24Hours,
            })
          } else if (recentLogs.length > 0) {
            updateTest(
              "Event Logs",
              "warning",
              `Found ${recentLogs.length} total events, but none in the last 24 hours`,
              { recentLogs },
            )
          } else {
            updateTest("Event Logs", "warning", "No event logs found. This might be normal for a new installation", {
              recentLogs,
            })
          }
        } else {
          updateTest("Event Logs", "error", `Failed to fetch event logs: ${logsResponse.status}`)
        }
      } catch (error) {
        updateTest(
          "Event Logs",
          "error",
          `Event logs check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }
    } finally {
      setLoading(false)

      // Calculate overall status
      setTimeout(() => {
        setTests((currentTests) => {
          const hasErrors = currentTests.some((t) => t.status === "error")
          const hasWarnings = currentTests.some((t) => t.status === "warning")

          if (hasErrors) {
            setOverallStatus("error")
          } else if (hasWarnings) {
            setOverallStatus("warning")
          } else {
            setOverallStatus("success")
          }

          return currentTests
        })
      }, 100)
    }
  }

  useEffect(() => {
    runSystemTests()
  }, [])

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>
      case "error":
        return <Badge variant="destructive">Failed</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      default:
        return <Badge variant="secondary">Running</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Health Check</h1>
        <Button onClick={runSystemTests} disabled={loading}>
          {loading ? "Running Tests..." : "Run Tests Again"}
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overallStatus === "success" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>System is Healthy</AlertTitle>
              <AlertDescription>
                All core systems are functioning properly. Your Facebook Pixel Gateway is ready to receive and process
                events.
              </AlertDescription>
            </Alert>
          )}
          {overallStatus === "warning" && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>System has Warnings</AlertTitle>
              <AlertDescription>
                The system is mostly functional but has some issues that should be addressed for optimal performance.
              </AlertDescription>
            </Alert>
          )}
          {overallStatus === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>System has Errors</AlertTitle>
              <AlertDescription>
                Critical issues detected that may prevent the system from functioning properly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Individual Test Results */}
      <div className="space-y-4">
        {tests.map((test, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  {test.name}
                </div>
                {getStatusBadge(test.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">{test.message}</p>
              {test.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">View Details</summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and troubleshooting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => (window.location.href = "/admin/dashboard")}
            >
              <Database className="h-4 w-4" />
              Admin Dashboard
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => (window.location.href = "/test-pixel")}
            >
              <Zap className="h-4 w-4" />
              Test Pixel
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => (window.location.href = "/integration-guide")}
            >
              <Globe className="h-4 w-4" />
              Integration Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
