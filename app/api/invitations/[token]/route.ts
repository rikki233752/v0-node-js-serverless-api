import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromRequest } from "@/lib/auth-utils"

// Accept an invitation
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = params.token

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 })
    }

    // Check if invitation has already been accepted
    if (invitation.accepted) {
      return NextResponse.json({ error: "Invitation has already been accepted" }, { status: 400 })
    }

    // Check if the invitation email matches the user's email
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "This invitation is for a different email address" }, { status: 403 })
    }

    // Check if the user is already a member of the team
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: invitation.teamId,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { accepted: true },
      })

      return NextResponse.json({ error: "You are already a member of this team" }, { status: 400 })
    }

    // Add the user to the team
    const member = await prisma.teamMember.create({
      data: {
        team: {
          connect: { id: invitation.teamId },
        },
        user: {
          connect: { id: user.id },
        },
        role: invitation.role,
      },
    })

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { accepted: true },
    })

    return NextResponse.json({ success: true, member })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 })
  }
}

// Get invitation details
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = params.token

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation has expired", invitation, expired: true }, { status: 200 })
    }

    // Check if invitation has already been accepted
    if (invitation.accepted) {
      return NextResponse.json(
        { error: "Invitation has already been accepted", invitation, accepted: true },
        { status: 200 },
      )
    }

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error("Error fetching invitation:", error)
    return NextResponse.json({ error: "Failed to fetch invitation" }, { status: 500 })
  }
}
