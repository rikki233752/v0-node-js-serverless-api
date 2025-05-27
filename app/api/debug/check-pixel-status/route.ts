import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopDomain = searchParams.get("shop") || "test-rikki-new.myshopify.com"

    // Get the shop configuration
    const shopConfig = await prisma.shopConfig.findUnique({
      where: { shopDomain },
      include: { pixelConfig: true },
    })

    // Get recent events for both pixel IDs
    const recentEvents = await prisma.eventLog.findMany({
      where: {
        OR: [{ pixelId: "864857281256627" }, { pixelId: "584928510540140" }],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // Get all pixel configurations
    const allPixels = await prisma.pixelConfig.findMany()

    return NextResponse.json({
      shopDomain,
      currentConfig: shopConfig,
      allPixels,
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        pixelId: event.pixelId,
        eventName: event.eventName,
        status: event.status,
        createdAt: event.createdAt,
        error: event.error,
      })),
      analysis: {
        configuredPixelId: shopConfig?.pixelConfig?.pixelId,
        shouldBePixelId: "584928510540140",
        lastSuccessfulEvent: recentEvents.find((e) => e.status === "success"),
        lastError: recentEvents.find((e) => e.status === "error"),
      },
    })
  } catch (error) {
    console.error("Error checking pixel status:", error)
    return NextResponse.json({ error: "Failed to check pixel status" }, { status: 500 })
  }
}
