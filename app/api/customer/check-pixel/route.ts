import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pixelId = searchParams.get("pixelId")

    if (!pixelId) {
      return NextResponse.json({ success: false, error: "Pixel ID is required" }, { status: 400, headers: corsHeaders })
    }

    console.log("🔍 [Check Pixel] Checking if pixel exists:", pixelId)

    // Check if the pixel exists in our database
    const pixelConfig = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    console.log("🔍 [Check Pixel] Pixel found:", !!pixelConfig)

    return NextResponse.json(
      {
        success: true,
        exists: !!pixelConfig,
        hasAccessToken: !!pixelConfig?.accessToken,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("💥 [Check Pixel] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check pixel",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}
