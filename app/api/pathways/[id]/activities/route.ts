import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth-utils"
import { canViewPathway } from "@/lib/team-utils"

// Get activities for a specific pathway
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathwayId = params.id

    // Check if user has access to this pathway
    const hasAccess = await canViewPathway(pathwayId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: "You don't have access to this pathway" }, { status: 403 })
    }

    // Get URL parameters
    const url = new URL(req.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "20")
    const offset = Number.parseInt(url.searchParams.get("offset") || "0")

    // Get activities for this pathway
    const activities = await prisma.activity.findMany({
      where: { pathwayId },
      include: {
        pathway: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    })

    // Get total count
    const totalCount = await prisma.activity.count({
      where: { pathwayId },
    })

    return NextResponse.json({
      activities,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
