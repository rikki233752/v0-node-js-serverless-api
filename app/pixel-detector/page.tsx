"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Search, Loader2 } from "lucide-react"

export default function PixelDetectorPage() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const detectPixel = async () => {
    if (!url) {
      setError("Please enter a website URL")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/public/detect-pixel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to detect pixel")
      }

      setResult(data)
    } catch (err) {
      setError(err.message || "An error occurred while detecting the pixel")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Facebook Pixel Detector</CardTitle>
          <CardDescription>Scan any website to detect Facebook Pixel IDs - no login required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter website URL (e.g., example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={detectPixel} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Detect Pixel
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert variant={result.pixelsFound > 0 ? "default" : "destructive"}>
                {result.pixelsFound > 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>
                  {result.pixelsFound > 0
                    ? `${result.pixelsFound} Facebook Pixel${result.pixelsFound > 1 ? "s" : ""} Found!`
                    : "No Facebook Pixels Found"}
                </AlertTitle>
                <AlertDescription>
                  {result.pixelsFound > 0
                    ? `We detected ${result.pixelsFound} Facebook Pixel${
                        result.pixelsFound > 1 ? "s" : ""
                      } on ${result.url}`
                    : `We couldn't find any Facebook Pixels on ${result.url}`}
                </AlertDescription>
              </Alert>

              {result.pixelsFound > 0 && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Detected Pixel IDs:</h3>
                  <ul className="space-y-2">
                    {result.detectedPixels.map((pixelId: string, index: number) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{pixelId}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-gray-500 mt-4">
            <p>
              <strong>How it works:</strong> This tool scans the HTML of the provided website for Facebook Pixel code
              patterns and extracts the Pixel IDs.
            </p>
            <p className="mt-2">
              <strong>Note:</strong> Some websites may block automated scanning or use techniques that prevent pixel
              detection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
