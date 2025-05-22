"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getShopFromUrl } from "@/lib/shopify-utils"

export function InstallationSuccess() {
  const [shop, setShop] = useState<string | null>(null)

  useEffect(() => {
    setShop(getShopFromUrl())
  }, [])

  if (!shop) return null

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-green-600">Installation Successful!</CardTitle>
        <CardDescription>Your app has been installed on {shop}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          The Facebook Pixel Gateway has been successfully installed on your Shopify store. You can now configure your
          Facebook Pixel settings in the app.
        </p>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => (window.location.href = `https://${shop}/admin/apps`)}>
            Go to Shopify Apps
          </Button>
          <Button onClick={() => (window.location.href = `/admin/dashboard?shop=${shop}`)}>Configure Pixel</Button>
        </div>
      </CardContent>
    </Card>
  )
}
