"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw, Search, AlertCircle } from "lucide-react"

export default function EventLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pixelId, setPixelId] = useState("")
  const [searchPixelId, setSearchPixelId] = useState("")

  const fetchLogs = async (pixelIdToFetch?: string) => {
    setLoading(true)
    setError(null)

    try {
      const url = pixelIdToFetch ? `/api/event-logs?pixelId=${encodeURIComponent(pixelIdToFetch)}` : "/api/event-logs"

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch event logs")
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleSearch = () => {
    setSearchPixelId(pixelId)
    fetchLogs(pixelId)
  }

  const handleRefresh = () => {
    fetchLogs(searchPixelId)
  }

  const handleViewError = (id: string) => {
    router.push(`/error-details?id=${id}`)
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "received":
        return "bg-blue-100 text-blue-800"
      case "processed":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold">Event Logs</h1>

        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
          <CardDescription>Filter event logs by pixel ID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="pixelId" className="sr-only">
                Pixel ID
              </Label>
              <Input
                id="pixelId"
                placeholder="Enter pixel ID"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{searchPixelId ? `Event Logs for Pixel ${searchPixelId}` : "All Event Logs"}</CardTitle>
          <CardDescription>Showing the most recent events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No event logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Pixel ID</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{log.pixelId}</TableCell>
                      <TableCell>{log.eventName}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(log.status)}`}
                        >
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.status === "error" && (
                          <Button variant="outline" size="sm" onClick={() => handleViewError(log.id)}>
                            View Error
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
