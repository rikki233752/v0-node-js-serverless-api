import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Get all shops from database
    const shops = await prisma.shopAuth.findMany({
      select: {
        id: true,
        shop: true,
        scopes: true,
        installed: true,
        createdAt: true,
        updatedAt: true,
        // Don't include accessToken for security
      },
    })

    // Get total count
    const totalCount = await prisma.shopAuth.count()

    return NextResponse.json({
      success: true,
      totalShops: totalCount,
      shops: shops,
      message: totalCount === 0 ? "No shops found in database" : `Found ${totalCount} shop(s)`,
    })
  } catch (error) {
    console.error("Database debug error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
