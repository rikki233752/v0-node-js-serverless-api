"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ShopifyInstallButtonProps {
  apiKey: string
  redirectUri: string
  scopes: string
  initialShop?: string | null
  className?: string
  buttonText?: string
  disabled?: boolean
}

export function ShopifyInstallButton({
  apiKey,
  redirectUri,
  scopes,
  initialShop = null,
  className = "",
  buttonText = "Install App",
  disabled = false,
}: ShopifyInstallButtonProps) {
  const [shopDomain, setShopDomain] = useState(initialShop || "")
  const [showInput, setShowInput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If initialShop is provided, show the input field
  useEffect(() => {
    if (initialShop) {
      setShowInput(true)
    }
  }, [initialShop])

  const handleInstall = () => {
    // If disabled, do nothing
    if (disabled) return

    if (!showInput) {
      setShowInput(true)
      return
    }

    // Validate shop domain
    let formattedShop = shopDomain.trim().toLowerCase()

    // Remove protocol (http:// or https://)
    formattedShop = formattedShop.replace(/^https?:\/\//, "")

    // Remove trailing slash
    formattedShop = formattedShop.replace(/\/$/, "")

    // If empty, show error
    if (!formattedShop) {
      setError("Please enter your Shopify store domain")
      return
    }

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

    // Check if API key is provided
    if (!apiKey) {
      setError("API key is not configured. Please contact the administrator.")
      return
    }

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
            disabled={disabled}
          />
          <Button onClick={handleInstall} className="whitespace-nowrap" disabled={disabled}>
            {buttonText}
          </Button>
        </div>
      ) : (
        <Button onClick={handleInstall} className={className} disabled={disabled}>
          {buttonText}
        </Button>
      )}
    </div>
  )
}
