"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ShopifyInstallButtonProps {
  apiKey: string
  redirectUri: string
  scopes: string
  className?: string
  buttonText?: string
}

export function ShopifyInstallButton({
  apiKey,
  redirectUri,
  scopes,
  className = "",
  buttonText = "Install App",
}: ShopifyInstallButtonProps) {
  const [shopDomain, setShopDomain] = useState("")
  const [showInput, setShowInput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInstall = () => {
    if (!showInput) {
      setShowInput(true)
      return
    }

    // Validate shop domain
    let formattedShop = shopDomain.trim().toLowerCase()

    // If they didn't add .myshopify.com, add it for them
    if (!formattedShop.includes(".myshopify.com")) {
      formattedShop = `${formattedShop}.myshopify.com`
    }

    // Validate the shop domain format
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
    if (!shopRegex.test(formattedShop)) {
      setError("Please enter a valid Shopify store domain")
      return
    }

    // Clear any previous errors
    setError(null)

    // Build the installation URL
    const installUrl = `https://${formattedShop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`

    // Redirect to the Shopify OAuth screen
    window.location.href = installUrl
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showInput ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            placeholder="yourstore.myshopify.com"
            className="flex-grow"
            onKeyDown={(e) => e.key === "Enter" && handleInstall()}
          />
          <Button onClick={handleInstall} className="whitespace-nowrap">
            {buttonText}
          </Button>
        </div>
      ) : (
        <Button onClick={handleInstall} className={className}>
          {buttonText}
        </Button>
      )}
    </div>
  )
}
