import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl, pixelId, accessToken } = await request.json()

    // Validate inputs
    if (!websiteUrl || !pixelId || !accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Clean the website URL
    let cleanUrl = websiteUrl.trim().toLowerCase()
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`
    }

    // Create or update pixel configuration
    const pixelConfig = await prisma.pixelConfig.upsert({
      where: { pixelId },
      update: {
        name: `Pixel for ${new URL(cleanUrl).hostname}`,
        accessToken,
      },
      create: {
        pixelId,
        name: `Pixel for ${new URL(cleanUrl).hostname}`,
        accessToken,
      },
    })

    // Create website configuration
    const websiteConfig = await prisma.websiteConfig.create({
      data: {
        websiteUrl: cleanUrl,
        pixelConfigId: pixelConfig.id,
        gatewayEnabled: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Configuration saved successfully",
      websiteConfig,
    })
  } catch (error) {
    console.error("Error saving website configuration:", error)
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 })
  }
}
