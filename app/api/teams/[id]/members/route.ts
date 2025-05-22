import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth-utils"
import { checkTeamPermission } from "@/lib/team-utils"

// Get all members of a team
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id

    // Check if user has access to this team
    const hasAccess = await checkTeamPermission(teamId, user.id, ["admin", "editor", "viewer"])
    if (!hasAccess) {
      return NextResponse.json({ error: "You don't have access to this team" }, { status: 403 })
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Error fetching team members:", error)
    return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 })
  }
}

// Add a member to a team
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id
    const { email, role } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if user is the owner or admin
    const hasAccess = await checkTeamPermission(teamId, user.id, ["admin"])
    if (!hasAccess) {
      return NextResponse.json({ error: "You don't have permission to add members to this team" }, { status: 403 })
    }

    // Check if the user exists
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    })

    if (!userToAdd) {
      // Create an invitation instead
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

      const invitation = await prisma.invitation.create({
        data: {
          email,
          teamId,
          role: role || "editor",
          token,
          expiresAt,
        },
      })

      // TODO: Send invitation email

      return NextResponse.json({ message: "Invitation sent to " + email, invitation }, { status: 201 })
    }

    // Check if the user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: userToAdd.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member of this team" }, { status: 400 })
    }

    // Add the user to the team
    const member = await prisma.teamMember.create({
      data: {
        team: {
          connect: { id: teamId },
        },
        user: {
          connect: { id: userToAdd.id },
        },
        role: role || "editor",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error("Error adding team member:", error)
    return NextResponse.json({ error: "Failed to add team member" }, { status: 500 })
  }
}
