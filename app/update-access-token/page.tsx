"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function UpdateAccessTokenPage() {
  const [pixelId, setPixelId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = async () => {
    if (!pixelId || !accessToken) {
      setError("Please enter both pixel ID and access token")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/update-access-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixelId,
          accessToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update access token")
      }

      setSuccess("Access token updated successfully!")
      setPixelId("")
      setAccessToken("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Update Facebook Access Token</h1>

      <Card>
        <CardHeader>
          <CardTitle>Update Token</CardTitle>
          <CardDescription>Enter a pixel ID and new access token</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pixelId">Facebook Pixel ID</Label>
              <Input
                id="pixelId"
                placeholder="584928510540140"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">New Access Token</Label>
              <Input
                id="accessToken"
                placeholder="EAAn9dux5ZCho..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                type="password"
              />
              <p className="text-xs text-gray-500">
                You can generate a new access token in the Facebook Business Manager.
              </p>
            </div>

            <Button onClick={handleUpdate} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Access Token"
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default" className="border-green-200 bg-green-50">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
