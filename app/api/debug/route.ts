import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Only enable in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Debug endpoint only available in development mode" }, { status: 403 })
  }

  // Return masked environment variables for debugging
  return NextResponse.json({
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? `${process.env.SHOPIFY_API_KEY.substring(0, 6)}...` : "Not set",
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "Set (masked)" : "Not set",
    SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES || "Not set",
    HOST: process.env.HOST || "Not set",
  })
}
