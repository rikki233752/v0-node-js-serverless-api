import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth-utils"
import { canViewPathway, canEditPathway, logActivity, checkTeamPermission } from "@/lib/team-utils"

// Get a specific pathway
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

    const pathway = await prisma.pathway.findUnique({
      where: { id: pathwayId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
          },
        },
        activities: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          include: {
            pathway: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!pathway) {
      return NextResponse.json({ error: "Pathway not found" }, { status: 404 })
    }

    return NextResponse.json({ pathway })
  } catch (error) {
    console.error("Error fetching pathway:", error)
    return NextResponse.json({ error: "Failed to fetch pathway" }, { status: 500 })
  }
}

// Update a pathway
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathwayId = params.id
    const { name, description, data, teamId } = await req.json()

    // Check if user has permission to edit this pathway
    const hasAccess = await canEditPathway(pathwayId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: "You don't have permission to edit this pathway" }, { status: 403 })
    }

    // If teamId is provided, check if user has permission to move pathways to this team
    if (teamId) {
      const hasTeamAccess = await checkTeamPermission(teamId, user.id, ["admin", "editor"])
      if (!hasTeamAccess) {
        return NextResponse.json({ error: "You don't have permission to move pathways to this team" }, { status: 403 })
      }
    }

    // Get the current pathway to check if it's being moved to a team
    const currentPathway = await prisma.pathway.findUnique({
      where: { id: pathwayId },
      select: { teamId: true },
    })

    // Update the pathway
    const updatedPathway = await prisma.pathway.update({
      where: { id: pathwayId },
      data: {
        name,
        description,
        data,
        team: teamId ? { connect: { id: teamId } } : currentPathway?.teamId ? { disconnect: true } : undefined,
        updater: { connect: { id: user.id } },
        updatedAt: new Date(),
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Log activity
    await logActivity(pathwayId, user.id, "updated", {
      nameChanged: name !== undefined,
      descriptionChanged: description !== undefined,
      dataChanged: data !== undefined,
      teamChanged: teamId !== currentPathway?.teamId,
    })

    return NextResponse.json({ pathway: updatedPathway })
  } catch (error) {
    console.error("Error updating pathway:", error)
    return NextResponse.json({ error: "Failed to update pathway" }, { status: 500 })
  }
}

// Delete a pathway
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pathwayId = params.id

    // Check if user has permission to delete this pathway
    const pathway = await prisma.pathway.findUnique({
      where: { id: pathwayId },
      include: {
        team: true,
      },
    })

    if (!pathway) {
      return NextResponse.json({ error: "Pathway not found" }, { status: 404 })
    }

    // If pathway belongs to a team, check if user is team owner or admin
    if (pathway.teamId) {
      const hasAccess = await checkTeamPermission(pathway.teamId, user.id, ["admin"])
      if (!hasAccess && pathway.creatorId !== user.id) {
        return NextResponse.json({ error: "You don't have permission to delete this pathway" }, { status: 403 })
      }
    } else if (pathway.creatorId !== user.id) {
      // If pathway doesn't belong to a team, only creator can delete it
      return NextResponse.json({ error: "You don't have permission to delete this pathway" }, { status: 403 })
    }

    // Delete the pathway
    await prisma.pathway.delete({
      where: { id: pathwayId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting pathway:", error)
    return NextResponse.json({ error: "Failed to delete pathway" }, { status: 500 })
  }
}
