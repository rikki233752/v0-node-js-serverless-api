"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Info } from "lucide-react"

export default function ManualLinkPage() {
  const [shopDomain, setShopDomain] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/manual-link-pixel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopDomain,
          pixelId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to link pixel to shop")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred")
      console.error("Error linking pixel:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Manual Pixel Linking Tool</CardTitle>
          <CardDescription>Directly link a Facebook Pixel ID to a Shopify store in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="shopDomain">Shop Domain</Label>
              <Input
                id="shopDomain"
                placeholder="your-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                required
              />
              <p className="text-sm text-gray-500">Enter the full Shopify domain (e.g., your-store.myshopify.com)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixelId">Facebook Pixel ID</Label>
              <Input
                id="pixelId"
                placeholder="123456789012345"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                required
              />
              <p className="text-sm text-gray-500">Enter the Facebook Pixel ID (e.g., 123456789012345)</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Linking..." : "Link Pixel to Shop"}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{result.success ? "Success" : "Failed"}</AlertTitle>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>

              {result.details && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <h3 className="font-medium">Operation Details:</h3>
                  <div className="space-y-2">
                    {Object.entries(result.details).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex items-start">
                        <Info className="h-4 w-4 mr-2 mt-1 text-blue-500" />
                        <div>
                          <span className="font-medium">{key}: </span>
                          <span>{typeof value === "object" ? JSON.stringify(value) : value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <a href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Back to Dashboard
          </a>
          <a href="/web-pixel-debug" className="text-sm text-blue-500 hover:text-blue-700">
            View Web Pixel Debug Data
          </a>
        </CardFooter>
      </Card>
    </div>
  )
}
