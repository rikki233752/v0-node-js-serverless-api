"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"

export default function AuthSuccess() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop")
  const status = searchParams.get("status")
  const webPixelStatus = searchParams.get("webPixelStatus")

  useEffect(() => {
    // Auto-redirect to app dashboard after 3 seconds
    const timer = setTimeout(() => {
      if (shop) {
        window.location.href = `/app?shop=${shop}`
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [shop])

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            App Installed Successfully!
          </CardTitle>
          <CardDescription>Your Facebook Pixel Gateway app has been installed on {shop}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Installation Status:</strong> {status === "connected" ? "✅ Connected" : "❌ Failed"}
            </p>
            <p className="text-sm">
              <strong>Web Pixel Status:</strong> {webPixelStatus === "success" ? "✅ Activated" : "⚠️ Needs Setup"}
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Next Step: Configure Your Facebook Pixel</h3>
            <p className="text-blue-800 text-sm mb-3">
              To start tracking events, you need to add your Facebook Pixel ID.
            </p>
            <p className="text-blue-700 text-xs">Redirecting to dashboard in 3 seconds...</p>
          </div>

          <Button onClick={() => (window.location.href = `/app?shop=${shop}`)} className="w-full">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
