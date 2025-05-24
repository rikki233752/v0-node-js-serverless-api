import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    console.log("Checking shop data for:", shop)

    // Check shopAuth table
    let shopAuthData = null
    try {
      shopAuthData = await prisma.shopAuth.findUnique({
        where: { shop },
      })
      console.log("shopAuth data:", shopAuthData)
    } catch (error) {
      console.log("shopAuth table error:", error)
    }

    // Check if there are any records in shopAuth
    let allShopAuth = null
    try {
      allShopAuth = await prisma.shopAuth.findMany({
        take: 5,
        select: { shop: true, installed: true, createdAt: true },
      })
      console.log("All shopAuth records:", allShopAuth)
    } catch (error) {
      console.log("Error listing shopAuth:", error)
    }

    // List all tables
    let tables = null
    try {
      tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
      console.log("Database tables:", tables)
    } catch (error) {
      console.log("Error listing tables:", error)
    }

    return NextResponse.json({
      shop,
      shopAuthData,
      allShopAuth,
      tables,
      hasAccessToken: !!shopAuthData?.accessToken,
    })
  } catch (error) {
    console.error("Error checking shop data:", error)
    return NextResponse.json(
      {
        error: "Failed to check shop data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
