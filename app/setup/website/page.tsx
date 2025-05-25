"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Info, Copy, CheckCircle, Globe } from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function WebsiteSetupPage() {
  const searchParams = useSearchParams()

  const [pixelId, setPixelId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [script, setScript] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Check for UTM parameters
  useEffect(() => {
    const utmPixelId = searchParams.get("utm_pixel_id") || searchParams.get("pixel_id")
    if (utmPixelId) {
      setPixelId(utmPixelId)
    }
  }, [searchParams])

  const generateScript = () => {
    if (!pixelId) {
      setError("Please enter your Facebook Pixel ID")
      return
    }

    setIsGenerating(true)
    setError(null)

    // Get the host URL
    const host = process.env.NEXT_PUBLIC_HOST || window.location.origin

    // Generate the script
    const scriptContent = `
<!-- Facebook Pixel Gateway -->
<script>
  !function(f,b,e,v,n,t,s) {
    if(f.fbq) return; n=f.fbq=function() {
      n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments)
    };
    if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0';
    n.queue=[]; t=b.createElement(e); t.async=!0;
    t.src=v; s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  
  // Initialize with your Pixel ID
  fbq('init', '${pixelId}');
  
  // Track PageView
  fbq('track', 'PageView');
  
  // Send all events through our gateway
  var originalFbq = fbq;
  fbq = function() {
    // Call original fbq
    originalFbq.apply(this, arguments);
    
    // Only forward tracking events to gateway
    if(arguments[0] === 'track') {
      var eventName = arguments[1];
      var eventData = arguments[2] || {};
      
      // Send to gateway
      fetch('${host}/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixelId: '${pixelId}',
          eventName: eventName,
          eventData: eventData,
          pageUrl: window.location.href,
          timestamp: new Date().toISOString(),
          source: 'website-script'
        }),
        keepalive: true
      }).catch(function(err) {
        console.error('Facebook Pixel Gateway error:', err);
      });
    }
  };
</script>
<!-- End Facebook Pixel Gateway -->
`.trim()

    setScript(scriptContent)
    setIsGenerating(false)
  }

  const saveConfiguration = async () => {
    if (!pixelId) {
      setError("Please enter your Facebook Pixel ID")
      return
    }

    setIsConfiguring(true)
    setError(null)

    try {
      const response = await fetch("/api/website/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelId,
          accessToken: accessToken || null,
        }),
      })

      if (!response.ok) {
        throw new Error(`Configuration failed: ${await response.text()}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Configuration failed")
      }

      // Generate the script after successful configuration
      generateScript()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Configuration failed")
    } finally {
      setIsConfiguring(false)
    }
  }

  const copyToClipboard = () => {
    if (script) {
      navigator.clipboard.writeText(script)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-md">
      <h1 className="text-3xl font-bold text-center mb-8">Set Up For Any Website</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Installation
          </CardTitle>
          <CardDescription>Generate a tracking script for any website</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
              This will generate a script that sends Facebook Pixel events through our gateway. Add it to your website's
              &lt;head&gt; section.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="pixelId">Facebook Pixel ID</Label>
            <Input
              id="pixelId"
              placeholder="123456789012345"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">Find this in your Facebook Business Manager under Events Manager</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">
              Facebook Access Token <span className="text-gray-500">(Optional)</span>
            </Label>
            <Input
              id="accessToken"
              placeholder="EAAG..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Optional: Provide an access token to enable server-side verification
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {script && (
            <div className="space-y-2">
              <Label htmlFor="script">Tracking Script</Label>
              <div className="relative">
                <Textarea id="script" value={script} readOnly className="font-mono text-xs h-48" />
                <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={copyToClipboard}>
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">Add this script to the &lt;head&gt; section of your website</p>
            </div>
          )}
        </CardContent>

        <CardFooter>
          {!script ? (
            <Button onClick={saveConfiguration} className="w-full" disabled={isConfiguring || isGenerating}>
              {isConfiguring ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Configuring...
                </>
              ) : (
                "Generate Tracking Script"
              )}
            </Button>
          ) : (
            <Button onClick={copyToClipboard} className="w-full" variant={copied ? "outline" : "default"}>
              {copied ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Using Shopify?{" "}
          <a href="/setup/shopify" className="text-blue-600 hover:underline">
            Set up for Shopify
          </a>
        </p>
      </div>
    </div>
  )
}
