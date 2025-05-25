import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pixelId = searchParams.get("pixelId")

    if (!pixelId) {
      return NextResponse.json({ success: false, error: "Pixel ID parameter is required" }, { status: 400 })
    }

    // Check if the pixel ID exists in the database
    const pixelConfig = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    return NextResponse.json({
      success: true,
      exists: !!pixelConfig,
      pixelId,
    })
  } catch (error) {
    console.error("Error checking pixel:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
