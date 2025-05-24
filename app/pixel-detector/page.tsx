"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Search, Loader2, Info } from "lucide-react"

export default function PixelDetectorPage() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")

  const detectPixel = async () => {
    if (!url) {
      setError("Please enter a website URL")
      return
    }

    setIsLoading(true)
    setError("")
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
              onKeyPress={(e) => e.key === "Enter" && detectPixel()}
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
                    : `We couldn't find any Facebook Pixels on ${result.url}. The pixel might be loaded dynamically or through a third-party service.`}
                </AlertDescription>
              </Alert>

              {result.pixelsFound > 0 && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Detected Pixel IDs:</h3>
                  <ul className="space-y-2">
                    {result.detectedPixels.map((pixelId, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{pixelId}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.pixelsFound === 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Possible Reasons</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>The pixel is loaded dynamically after page load</li>
                      <li>The pixel is implemented server-side</li>
                      <li>The pixel is loaded through Google Tag Manager or similar</li>
                      <li>The website blocks automated scanning</li>
                      <li>The pixel code is heavily obfuscated</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="text-sm text-gray-500 mt-4">
            <p>
              <strong>How it works:</strong> This tool scans the HTML of the provided website for Facebook Pixel code
              patterns including fbq init, script URLs, data attributes, and more.
            </p>
            <p className="mt-2">
              <strong>Note:</strong> Some websites load pixels dynamically or use server-side tracking which cannot be
              detected by this tool.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
