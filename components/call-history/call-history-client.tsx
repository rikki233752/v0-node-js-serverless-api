"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"

interface Call {
  id: string
  from: string
  to: string
  status: string
  duration: number
  created_at: string
}

export function CallHistoryClient({ phoneNumber }: { phoneNumber: string }) {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/bland-ai/call-history?number=${encodeURIComponent(phoneNumber)}`)

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to fetch call history")
        }

        const data = await res.json()
        setCalls(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        console.error("Error fetching calls:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCalls()
  }, [phoneNumber])

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      failed: { color: "bg-red-100 text-red-800", label: "Failed" },
      in_progress: { color: "bg-blue-100 text-blue-800", label: "In Progress" },
      no_answer: { color: "bg-yellow-100 text-yellow-800", label: "No Answer" },
      busy: { color: "bg-orange-100 text-orange-800", label: "Busy" },
      default: { color: "bg-gray-100 text-gray-800", label: status },
    }

    const { color, label } = statusMap[status?.toLowerCase()] || statusMap.default

    return (
      <Badge className={color} variant="outline">
        {label}
      </Badge>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-6 text-red-500">
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <p>No calls found for this number.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call, i) => (
                <TableRow key={call.id || i}>
                  <TableCell>{call.from || "Unknown"}</TableCell>
                  <TableCell>{call.to || "Unknown"}</TableCell>
                  <TableCell>{getStatusBadge(call.status || "Unknown")}</TableCell>
                  <TableCell>{formatDuration(call.duration || 0)}</TableCell>
                  <TableCell>
                    {call.created_at ? formatDistanceToNow(new Date(call.created_at), { addSuffix: true }) : "Unknown"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
