"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function ErrorDetailsPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    if (!id) {
      setError("No event log ID provided")
      setLoading(false)
      return
    }

    async function fetchDetails() {
      try {
        const response = await fetch(`/api/debug/error-details?id=${encodeURIComponent(id)}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch error details")
        }

        const data = await response.json()
        setDetails(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Error Details</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
          <CardDescription>Basic information about the event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Event ID</p>
              <p className="text-sm text-gray-500">{details.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Pixel ID</p>
              <p className="text-sm text-gray-500">{details.pixelId}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Event Name</p>
              <p className="text-sm text-gray-500">{details.eventName}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className="text-sm text-gray-500">{details.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Created At</p>
              <p className="text-sm text-gray-500">{new Date(details.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {details.error && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle>Error Details</CardTitle>
            <CardDescription>Information about what went wrong</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
              {JSON.stringify(details.error, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {details.payload && (
        <Card>
          <CardHeader>
            <CardTitle>Event Payload</CardTitle>
            <CardDescription>Data that was sent with this event</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
              {JSON.stringify(details.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
