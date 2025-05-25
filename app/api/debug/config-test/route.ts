import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function GET(request: Request) {
  try {
    console.log("🔍 [Debug Config] Testing database connection...")

    // Test database connection
    await prisma.$connect()
    console.log("✅ [Debug Config] Database connected")

    // Check if tables exist and have data
    const pixelCount = await prisma.pixelConfig.count()
    const shopCount = await prisma.shopConfig.count()
    const eventCount = await prisma.eventLog.count()

    console.log("📊 [Debug Config] Table counts:", { pixelCount, shopCount, eventCount })

    // Get sample data
    const samplePixels = await prisma.pixelConfig.findMany({ take: 3 })
    const sampleShops = await prisma.shopConfig.findMany({ take: 3 })

    console.log("📋 [Debug Config] Sample data:", { samplePixels, sampleShops })

    // Test environment variables
    const envVars = {
      FACEBOOK_PIXEL_ID: !!process.env.FACEBOOK_PIXEL_ID,
      FACEBOOK_ACCESS_TOKEN: !!process.env.FACEBOOK_ACCESS_TOKEN,
      DATABASE_URL: !!process.env.DATABASE_URL,
    }

    return NextResponse.json(
      {
        success: true,
        database: {
          connected: true,
          pixelCount,
          shopCount,
          eventCount,
          samplePixels: samplePixels.map((p) => ({ id: p.id, pixelId: p.pixelId, name: p.name })),
          sampleShops: sampleShops.map((s) => ({ id: s.id, shopDomain: s.shopDomain, pixelConfigId: s.pixelConfigId })),
        },
        environment: envVars,
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("💥 [Debug Config] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders, status: 204 })
}
