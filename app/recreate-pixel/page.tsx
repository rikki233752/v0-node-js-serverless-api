"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

export default function RecreatePixelPage() {
  const [shop, setShop] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [pixelId, setPixelId] = useState("")

  const handleRecreate = async () => {
    try {
      setStatus("loading")
      setMessage("Processing request...")

      const response = await fetch("/api/shopify/recreate-web-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(`Successfully initiated recreation process for ${data.shop}`)
        setPixelId(data.pixelId)
      } else {
        setStatus("error")
        setMessage(data.error || "An unknown error occurred")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Failed to process request")
      console.error("Error recreating pixel:", error)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Recreate Facebook Pixel</CardTitle>
          <CardDescription>Use this tool to recreate the Facebook Pixel for a Shopify store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop">Shopify Store Domain</Label>
              <Input
                id="shop"
                placeholder="your-store.myshopify.com"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
              />
            </div>

            {status !== "idle" && (
              <div
                className={`p-4 rounded-md ${
                  status === "loading"
                    ? "bg-blue-50 text-blue-700"
                    : status === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {status === "loading" && <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />}
                    {status === "success" && <CheckCircle className="h-5 w-5 text-green-400" />}
                    {status === "error" && <AlertCircle className="h-5 w-5 text-red-400" />}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{message}</p>
                    {status === "success" && pixelId && <p className="mt-2 text-sm">Pixel ID: {pixelId}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleRecreate} disabled={!shop || status === "loading"} className="w-full">
            {status === "loading" ? "Processing..." : "Recreate Pixel"}
          </Button>
        </CardFooter>
      </Card>

      {status === "success" && (
        <div className="max-w-md mx-auto mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-medium text-yellow-800">Next Steps</h3>
          <ol className="mt-2 text-sm text-yellow-700 list-decimal list-inside space-y-1">
            <li>Wait 2-3 minutes for the changes to propagate</li>
            <li>Hard refresh your Shopify store (Ctrl+Shift+R or Cmd+Shift+R)</li>
            <li>Check browser console for logs starting with 🚀 [FB Pixel]</li>
            <li>Verify events are being sent to the API</li>
          </ol>
        </div>
      )}
    </div>
  )
}
