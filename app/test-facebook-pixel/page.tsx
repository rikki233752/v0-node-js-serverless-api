"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function TestFacebookPixel() {
  const [eventType, setEventType] = useState("Purchase")
  const [testData, setTestData] = useState({
    email: "test@example.com",
    phone: "",
    currency: "USD",
    value: "99.99",
    orderId: "",
    productIds: "test_product_123",
    numItems: "1",
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const sendTestEvent = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-facebook-pixel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType,
          testData: {
            ...testData,
            value: Number.parseFloat(testData.value) || 0,
            numItems: Number.parseInt(testData.numItems) || 1,
            productIds: testData.productIds.split(",").map((id) => id.trim()),
            orderId: testData.orderId || `test_order_${Date.now()}`,
          },
        }),
      })

      const data = await response.json()
      setResult(data)
      console.log("Test result:", data)
    } catch (error) {
      console.error("Test failed:", error)
      setResult({
        success: false,
        error: "Request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateRandomData = () => {
    setTestData({
      email: `test${Math.floor(Math.random() * 1000)}@example.com`,
      phone: `+1555${Math.floor(Math.random() * 9000000) + 1000000}`,
      currency: "USD",
      value: (Math.random() * 200 + 10).toFixed(2),
      orderId: `order_${Date.now()}`,
      productIds: `product_${Math.floor(Math.random() * 1000)}, product_${Math.floor(Math.random() * 1000)}`,
      numItems: Math.floor(Math.random() * 5) + 1,
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Facebook Pixel Testing</h1>
        <p className="text-muted-foreground mt-2">Test Facebook Pixel events without Shopify</p>
      </div>

      <Alert>
        <AlertDescription>
          This tool lets you test Facebook Pixel events directly, without needing a Shopify store. Perfect for
          development and testing your pixel configuration.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Event Configuration</CardTitle>
          <CardDescription>Configure the test event you want to send</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="eventType">Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Purchase">Purchase</SelectItem>
                <SelectItem value="InitiateCheckout">Initiate Checkout</SelectItem>
                <SelectItem value="ViewContent">View Content</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={testData.email}
                onChange={(e) => setTestData({ ...testData, email: e.target.value })}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={testData.phone}
                onChange={(e) => setTestData({ ...testData, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={testData.currency}
                onChange={(e) => setTestData({ ...testData, currency: e.target.value })}
                placeholder="USD"
              />
            </div>
            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={testData.value}
                onChange={(e) => setTestData({ ...testData, value: e.target.value })}
                placeholder="99.99"
              />
            </div>
            <div>
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                value={testData.orderId}
                onChange={(e) => setTestData({ ...testData, orderId: e.target.value })}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <Label htmlFor="numItems">Number of Items</Label>
              <Input
                id="numItems"
                type="number"
                value={testData.numItems}
                onChange={(e) => setTestData({ ...testData, numItems: e.target.value })}
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="productIds">Product IDs (comma-separated)</Label>
            <Input
              id="productIds"
              value={testData.productIds}
              onChange={(e) => setTestData({ ...testData, productIds: e.target.value })}
              placeholder="product_123, product_456"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={sendTestEvent} disabled={loading}>
              {loading ? "Sending..." : `Send ${eventType} Event`}
            </Button>
            <Button onClick={generateRandomData} variant="outline">
              Generate Random Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Test Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant={result.success ? "default" : "destructive"}>{result.success ? "Success" : "Failed"}</Badge>

            {result.success && (
              <Alert>
                <AlertDescription>
                  ✅ Event sent successfully! Check your Facebook Events Manager to see the event.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label>Response Details</Label>
              <Textarea value={JSON.stringify(result, null, 2)} readOnly className="min-h-[200px] font-mono text-sm" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>1. Check Facebook Events Manager:</strong> Go to your Facebook Business Manager → Events Manager
              to see if the test events appear.
            </p>
            <p>
              <strong>2. Use Test Events:</strong> If you have a test event code, add it to your environment variables
              as FACEBOOK_TEST_EVENT_CODE.
            </p>
            <p>
              <strong>3. Create a Real Store:</strong> When ready for production, create a real Shopify store for full
              integration testing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
