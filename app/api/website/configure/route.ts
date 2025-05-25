import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { pixelId, accessToken } = await request.json()

    if (!pixelId) {
      return NextResponse.json({ error: "Pixel ID is required" }, { status: 400 })
    }

    // Create or update the pixel configuration
    const pixelConfig = await prisma.pixelConfig.upsert({
      where: { pixelId },
      update: {
        accessToken: accessToken || undefined,
        updatedAt: new Date(),
      },
      create: {
        pixelId,
        name: `Pixel ${pixelId}`,
        accessToken: accessToken || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      pixelConfig: {
        id: pixelConfig.id,
        pixelId: pixelConfig.pixelId,
        name: pixelConfig.name,
        hasAccessToken: !!pixelConfig.accessToken,
      },
    })
  } catch (error) {
    console.error("Error configuring website:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
