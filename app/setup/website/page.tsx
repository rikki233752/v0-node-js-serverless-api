"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Copy, Check } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function WebsiteSetup() {
  const searchParams = useSearchParams()
  const [pixelId, setPixelId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get pixel ID from URL parameters if available
  useEffect(() => {
    const pixelIdParam = searchParams.get("pixel_id") || searchParams.get("utm_pixel_id")
    if (pixelIdParam) {
      setPixelId(pixelIdParam)
    }
  }, [searchParams])

  // Generate the tracking script
  const generateScript = () => {
    const host = process.env.NEXT_PUBLIC_HOST || window.location.origin
    return `<!-- Facebook Pixel Gateway -->
<script>
(function(w,d,s,l,i){
  w[l]=w[l]||[];
  w[l].push({'pixelId':i});
  var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),
      dl=l!='dataLayer'?'&l='+l:'';
  j.async=true;
  j.src='${host}/client-script.js';
  f.parentNode.insertBefore(j,f);
})(window,document,'script','fbPixelGateway','${pixelId}');
</script>
<!-- End Facebook Pixel Gateway -->`
  }

  // Copy script to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateScript())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Save configuration to database
  const saveConfiguration = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Validate inputs
      if (!pixelId) {
        throw new Error("Please enter your Facebook Pixel ID")
      }

      // Save configuration
      const response = await fetch("/api/website/configure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixelId,
          accessToken,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save configuration")
      }

      setIsConfigured(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Set Up for Any Website</CardTitle>
          <CardDescription>Add our tracking script to your website to start sending events</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isConfigured && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                Configuration saved successfully! Your pixel is now ready to use.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="setup">
            <TabsList className="mb-4">
              <TabsTrigger value="setup">1. Configure</TabsTrigger>
              <TabsTrigger value="install">2. Install Script</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <div>
                <label htmlFor="pixelId" className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook Pixel ID
                </label>
                <Input
                  id="pixelId"
                  placeholder="123456789012345"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your Facebook Pixel ID. You can find this in your Facebook Events Manager.
                </p>
              </div>

              <div>
                <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook Access Token (Optional)
                </label>
                <Input
                  id="accessToken"
                  placeholder="EAAxxxxx..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  type="password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your Facebook Access Token for server-side events. You can add this later.
                </p>
              </div>

              <Button onClick={saveConfiguration} disabled={isLoading} className="w-full">
                {isLoading ? "Saving..." : "Save Configuration"}
              </Button>
            </TabsContent>

            <TabsContent value="install">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add this script to your website
                  </label>
                  <div className="relative">
                    <Textarea value={generateScript()} readOnly className="font-mono text-xs h-48 bg-gray-50" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={copyToClipboard}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Add this script to the <code>&lt;head&gt;</code> section of your website.
                  </p>
                </div>

                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                  <h3 className="text-sm font-medium text-amber-800 mb-2">Installation Instructions</h3>
                  <ol className="text-xs text-amber-700 space-y-1 list-decimal pl-4">
                    <li>Copy the script above</li>
                    <li>
                      Paste it in the <code>&lt;head&gt;</code> section of your website
                    </li>
                    <li>The script will automatically send events to our gateway</li>
                    <li>For server-side events, make sure to add your Facebook Access Token in the configuration</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button onClick={copyToClipboard}>
            {copied ? "Copied!" : "Copy Script"}
            <Copy className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
