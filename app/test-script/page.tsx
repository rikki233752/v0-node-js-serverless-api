"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, CopyIcon, CheckIcon } from "lucide-react"

export default function TestScriptPage() {
  const [copied, setCopied] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  const testScript = `
<script>
// Test script for Web Pixel Debug
(function() {
  console.log("🧪 Test script for Web Pixel Debug starting...");
  
  // Mock configuration object similar to what Shopify Web Pixel would have
  const mockConfiguration = {
    accountID: "584928510540140", // Example Facebook Pixel ID
    settings: {
      shopDomain: "test-rikki-new.myshopify.com",
      testMode: true
    }
  };
  
  // Mock analytics object
  const mockAnalytics = {
    meta: {
      pixelId: "584928510540140"
    }
  };
  
  // Prepare debug data
  const debugData = {
    currentUrl: window.location.href,
    detectedPixels: ["584928510540140"],
    source: "test-script",
    userAgent: navigator.userAgent,
    configAccountId: mockConfiguration.accountID,
    configData: mockConfiguration,
    analyticsData: mockAnalytics.meta,
    timestamp: new Date().toISOString(),
    testId: "manual-test-" + Math.random().toString(36).substring(2, 9)
  };
  
  console.log("🧪 Sending test data:", debugData);
  
  // Send to debug endpoint
  fetch("${baseUrl}/api/debug/web-pixel-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(debugData),
    mode: "cors"
  })
  .then(response => {
    console.log("🧪 Test response status:", response.status);
    return response.json();
  })
  .then(data => {
    console.log("🧪 Test completed successfully:", data);
    document.getElementById("test-result").textContent = "Test completed successfully! Check the debug page.";
    document.getElementById("test-result").style.color = "green";
  })
  .catch(error => {
    console.error("🧪 Test failed:", error);
    document.getElementById("test-result").textContent = "Test failed: " + error.message;
    document.getElementById("test-result").style.color = "red";
  });
})();
</script>
<div id="test-result" style="margin-top: 20px; font-weight: bold;">Running test...</div>
`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(testScript.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const runTest = async () => {
    setTesting(true)
    try {
      // Mock configuration object similar to what Shopify Web Pixel would have
      const mockConfiguration = {
        accountID: "584928510540140", // Example Facebook Pixel ID
        settings: {
          shopDomain: "test-rikki-new.myshopify.com",
          testMode: true,
        },
      }

      // Mock analytics object
      const mockAnalytics = {
        meta: {
          pixelId: "584928510540140",
        },
      }

      // Prepare debug data
      const debugData = {
        currentUrl: window.location.href,
        detectedPixels: ["584928510540140"],
        source: "test-script-page",
        userAgent: navigator.userAgent,
        configAccountId: mockConfiguration.accountID,
        configData: mockConfiguration,
        analyticsData: mockAnalytics.meta,
        timestamp: new Date().toISOString(),
        testId: "page-test-" + Math.random().toString(36).substring(2, 9),
      }

      console.log("🧪 Sending test data:", debugData)

      // Send to debug endpoint
      const response = await fetch(`${baseUrl}/api/debug/web-pixel-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(debugData),
      })

      const data = await response.json()
      setTestResult({
        success: response.ok,
        status: response.status,
        data: data,
      })
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Web Pixel Debug Test Script</CardTitle>
          <CardDescription>
            Use this script to test if the Web Pixel debug endpoint is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>How to use this test script</AlertTitle>
            <AlertDescription>
              Copy this script and add it to your Shopify theme or paste it into the browser console on your Shopify
              store. Then check the{" "}
              <a href="/web-pixel-debug" className="underline">
                Web Pixel Debug page
              </a>{" "}
              to see if the data was received.
            </AlertDescription>
          </Alert>

          <div className="relative">
            <Textarea
              value={testScript.trim()}
              readOnly
              className="font-mono text-sm h-96 resize-none"
              spellCheck={false}
            />
            <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={copyToClipboard}>
              {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <div className="flex flex-col space-y-4">
            <Button onClick={runTest} disabled={testing}>
              {testing ? "Testing..." : "Run Test Directly From This Page"}
            </Button>

            {testResult && (
              <div
                className={`p-4 rounded-md ${
                  testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}
              >
                <h3 className={`font-medium ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                  Test Result: {testResult.success ? "Success" : "Failed"}
                </h3>
                {testResult.status && <p>Status: {testResult.status}</p>}
                {testResult.error && <p>Error: {testResult.error}</p>}
                <pre className="mt-2 text-sm bg-white p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(testResult.data || {}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <a href="/web-pixel-debug" className="text-blue-600 hover:underline">
            Go to Web Pixel Debug Page
          </a>
        </CardFooter>
      </Card>
    </div>
  )
}
