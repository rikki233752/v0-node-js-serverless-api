import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { pixelId, accessToken } = await request.json()

    // Validate inputs
    if (!pixelId || !accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create or update pixel configuration
    const pixelConfig = await prisma.pixelConfig.upsert({
      where: { pixelId },
      update: {
        accessToken,
      },
      create: {
        pixelId,
        name: `Pixel ${pixelId}`,
        accessToken,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Configuration saved successfully",
      pixelConfig: {
        id: pixelConfig.id,
        pixelId: pixelConfig.pixelId,
        name: pixelConfig.name,
      },
    })
  } catch (error) {
    console.error("Error saving pixel configuration:", error)
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 })
  }
}
