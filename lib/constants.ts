// Shopify configuration constants
export const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || "test-rikki-new.myshopify.com"

// API endpoints
export const SHOPIFY_API_VERSION = "2024-01"

// Scopes required for the app
export const REQUIRED_SCOPES = ["read_customers", "read_orders", "read_checkouts", "write_web_pixels"]

// Default configuration
export const DEFAULT_PIXEL_ID = "default-account"
export const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || "864857281256627"

// Gateway configuration
export const GATEWAY_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/track`
  : "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

// Debug settings
export const DEBUG_MODE = process.env.NODE_ENV === "development"
