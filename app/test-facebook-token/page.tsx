"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export default function TestFacebookTokenPage() {
  const [pixelId, setPixelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    if (!pixelId) {
      setError("Please enter a pixel ID")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/test-facebook-token?pixelId=${encodeURIComponent(pixelId)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to test token")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Test Facebook Access Token</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Token</CardTitle>
          <CardDescription>Enter a pixel ID to test its associated access token</CardDescription>
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

            <Button onClick={handleTest} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Access Token"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className={result.success ? "border-green-200" : "border-red-200"}>
          <CardHeader>
            <CardTitle className="flex items-center">
              {result.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Token Valid
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  Token Invalid
                </>
              )}
            </CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">User ID:</span> {result.tokenInfo.userId}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Name:</span> {result.tokenInfo.name}
                </p>
              </div>
            ) : (
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
