import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pixelId, accessToken } = body

    if (!pixelId || !accessToken) {
      return NextResponse.json({ error: "Pixel ID and access token are required" }, { status: 400 })
    }

    // Find the pixel configuration
    const pixelConfig = await prisma.pixelConfig.findFirst({
      where: { pixelId },
    })

    if (!pixelConfig) {
      return NextResponse.json({ error: "Pixel configuration not found" }, { status: 404 })
    }

    // Update the access token
    const updatedPixelConfig = await prisma.pixelConfig.update({
      where: { id: pixelConfig.id },
      data: { accessToken },
    })

    return NextResponse.json({
      success: true,
      message: "Access token updated successfully",
      pixelId: updatedPixelConfig.pixelId,
    })
  } catch (error) {
    console.error("Error updating access token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
