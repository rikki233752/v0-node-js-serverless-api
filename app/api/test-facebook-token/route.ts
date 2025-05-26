import { type NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const pixelId = searchParams.get("pixelId")

    if (!pixelId) {
      return NextResponse.json({ error: "Missing pixel ID" }, { status: 400 })
    }

    // Get the pixel configuration
    const pixelConfig = await prisma.pixelConfig.findFirst({
      where: { pixelId },
    })

    if (!pixelConfig) {
      return NextResponse.json({ error: "Pixel configuration not found" }, { status: 404 })
    }

    const accessToken = pixelConfig.accessToken

    if (!accessToken) {
      return NextResponse.json({ error: "No access token found for this pixel" }, { status: 400 })
    }

    // Test the access token by making a simple request to the Facebook Graph API
    try {
      const response = await axios.get(`https://graph.facebook.com/v17.0/me`, {
        params: { access_token: accessToken },
        timeout: 5000,
      })

      return NextResponse.json({
        success: true,
        message: "Access token is valid",
        tokenInfo: {
          userId: response.data.id,
          name: response.data.name,
        },
      })
    } catch (apiError: any) {
      const errorResponse = apiError.response?.data || {}

      return NextResponse.json({
        success: false,
        error: "Access token validation failed",
        details: {
          message: apiError.message,
          status: apiError.response?.status,
          data: errorResponse,
        },
      })
    }
  } catch (error) {
    console.error("Error testing Facebook token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
