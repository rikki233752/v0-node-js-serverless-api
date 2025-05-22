"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, Database } from "lucide-react"

export default function DatabaseStatus() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState<any>(null)

  const checkDatabaseStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/db-status")
      const data = await response.json()

      if (response.ok) {
        setDbStatus(data)
      } else {
        setError(data.error || "Failed to check database status")
      }
    } catch (err) {
      setError("An error occurred while checking database status")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDatabaseStatus()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Database Status</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Database Connection Status</CardTitle>
          <CardDescription>Check if your application can connect to the database</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Checking database connection...</div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : dbStatus ? (
            <div className="space-y-6">
              <Alert variant={dbStatus.success ? "default" : "destructive"}>
                {dbStatus.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{dbStatus.success ? "Connected" : "Connection Failed"}</AlertTitle>
                <AlertDescription>
                  {dbStatus.success ? "Successfully connected to the database." : "Failed to connect to the database."}
                </AlertDescription>
              </Alert>

              {dbStatus.success && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Database Tables:</h3>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      {dbStatus.connection.tables.map((table: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                          <Database className="h-4 w-4" />
                          <span>{table.table_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Record Counts:</h3>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p>
                        <strong>Pixel Configurations:</strong> {dbStatus.stats.pixelConfigs}
                      </p>
                      <p>
                        <strong>Event Logs:</strong> {dbStatus.stats.eventLogs}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-center">
                <Button onClick={checkDatabaseStatus} disabled={loading}>
                  {loading ? "Checking..." : "Refresh Status"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">No database status available</div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to Home
        </Button>
        <Button onClick={() => (window.location.href = "/login?redirect=/admin/dashboard")}>
          Go to Admin Dashboard
        </Button>
      </div>
    </div>
  )
}
