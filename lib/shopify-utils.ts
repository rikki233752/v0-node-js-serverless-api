"use client"

/**
 * Gets the shop parameter from the URL
 */
export function getShopFromUrl(): string | null {
  if (typeof window === "undefined") return null

  const url = new URL(window.location.href)
  return url.searchParams.get("shop")
}

/**
 * Validates a Shopify shop domain
 */
export function isValidShopDomain(shop: string): boolean {
  // Clean the shop domain first
  const cleanShop = formatShopDomain(shop)
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
  return shopRegex.test(cleanShop)
}

/**
 * Formats a shop domain to ensure it has .myshopify.com
 * and removes protocols and trailing slashes
 */
export function formatShopDomain(shop: string): string {
  let formattedShop = shop.trim().toLowerCase()

  // Remove protocol (http:// or https://)
  formattedShop = formattedShop.replace(/^https?:\/\//, "")

  // Remove trailing slash
  formattedShop = formattedShop.replace(/\/$/, "")

  if (!formattedShop.includes(".myshopify.com")) {
    formattedShop = `${formattedShop}.myshopify.com`
  }

  return formattedShop
}

/**
 * Builds a Shopify app installation URL
 */
export function buildInstallUrl(shop: string, apiKey: string, redirectUri: string, scopes: string): string {
  const formattedShop = formatShopDomain(shop)

  return `https://${formattedShop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`
}
