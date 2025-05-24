import { type NextRequest, NextResponse } from "next/server"
import { SHOPIFY_STORE_DOMAIN } from "@/lib/constants"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Basic check to see if the environment variables are set
    const storeDomain = SHOPIFY_STORE_DOMAIN

    if (!storeDomain) {
      return NextResponse.json(
        {
          status: "error",
          message: "SHOPIFY_STORE_DOMAIN environment variable is not set.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      status: "ok",
      storeDomain: storeDomain,
    })
  } catch (error: any) {
    console.error("Error in /api/debug/web-pixel-status:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
