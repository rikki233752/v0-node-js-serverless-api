"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Phone } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import type { CallLog } from "@/lib/db-utils"

export default function CallLogsPage() {
  const searchParams = useSearchParams()
  const phoneNumberId = searchParams.get("phoneNumberId")
  const { user } = useAuth()
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch if user is authenticated and phoneNumberId is provided
    if (!user || !phoneNumberId) {
      setIsLoading(false)
      return
    }

    // Fetch call logs from the API
    const fetchCallLogs = async () => {
      try {
        setIsLoading(true)

        // Use the API endpoint that filters by phone_number_id
        const response = await fetch(`/api/call-logs?phoneNumberId=${phoneNumberId}`)

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const data = await response.json()

        // Check if we have valid data
        if (data && Array.isArray(data)) {
          setCallLogs(data)
        } else {
          console.warn("Unexpected data format:", data)
          setCallLogs([])
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching call logs:", err)
        setError("Failed to load call logs. Please try again later.")
        setIsLoading(false)
      }
    }

    fetchCallLogs()
  }, [user, phoneNumberId])

  if (!phoneNumberId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Phone number ID is required to view call logs.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Call Logs</h1>
        <p className="text-muted-foreground">View call history for your phone number</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading call logs...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : callLogs.length === 0 ? (
        <div className="text-center py-12">
          <Phone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Call Logs Found</h3>
          <p className="text-muted-foreground mb-6">There are no call logs for this phone number yet.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
            <CardDescription>Recent calls for your phone number</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Sentiment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.caller_number || "Unknown"}</TableCell>
                    <TableCell>
                      {log.duration
                        ? `${Math.floor(log.duration / 60)}:${(log.duration % 60).toString().padStart(2, "0")}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === "completed" ? "default" : "outline"}>
                        {log.status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(log.started_at).toLocaleString()}</TableCell>
                    <TableCell>{log.sentiment || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
