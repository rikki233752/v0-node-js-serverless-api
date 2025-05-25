"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

export default function InstallScriptPage() {
  const [shop, setShop] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [scriptTagId, setScriptTagId] = useState("")

  const handleInstall = async () => {
    try {
      setStatus("loading")
      setMessage("Installing script tag...")

      const response = await fetch("/api/shopify/install-script-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, accessToken }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(`Successfully installed script tag for ${data.shop}`)
        setScriptTagId(data.scriptTagId)
      } else {
        setStatus("error")
        setMessage(data.error || "An unknown error occurred")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Failed to install script tag")
      console.error("Error installing script tag:", error)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Install Facebook Pixel Script</CardTitle>
          <CardDescription>
            This will install a direct script tag for Facebook Pixel tracking, bypassing the Web Pixel extension
          </CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="accessToken">Shopify Admin API Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="shpat_..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                This is your Shopify Admin API access token. It will only be used to install the script tag.
              </p>
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
                    {status === "success" && scriptTagId && (
                      <p className="mt-2 text-sm">Script Tag ID: {scriptTagId}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleInstall} disabled={!shop || !accessToken || status === "loading"} className="w-full">
            {status === "loading" ? "Installing..." : "Install Script Tag"}
          </Button>
        </CardFooter>
      </Card>

      {status === "success" && (
        <div className="max-w-md mx-auto mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-medium text-yellow-800">Next Steps</h3>
          <ol className="mt-2 text-sm text-yellow-700 list-decimal list-inside space-y-1">
            <li>Wait 1-2 minutes for the script to be installed</li>
            <li>Hard refresh your Shopify store (Ctrl+Shift+R or Cmd+Shift+R)</li>
            <li>Check browser console for logs starting with 🚀 [Direct FB Pixel]</li>
            <li>Verify events are being sent to the API</li>
          </ol>
        </div>
      )}
    </div>
  )
}
