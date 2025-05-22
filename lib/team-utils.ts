import { prisma } from "@/lib/prisma"

// Check if a user has a specific permission in a team
export async function checkTeamPermission(teamId: string, userId: string, allowedRoles: string[]): Promise<boolean> {
  // First check if user is the team owner
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  })

  if (!team) {
    return false
  }

  if (team.ownerId === userId) {
    return true // Team owner has all permissions
  }

  // Check if user is a member with an allowed role
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  })

  if (!membership) {
    return false // User is not a member
  }

  return allowedRoles.includes(membership.role)
}

// Check if a user can edit a pathway
export async function canEditPathway(pathwayId: string, userId: string): Promise<boolean> {
  const pathway = await prisma.pathway.findUnique({
    where: { id: pathwayId },
    include: {
      team: true,
    },
  })

  if (!pathway) {
    return false
  }

  // If pathway has no team, check if user is the creator
  if (!pathway.teamId) {
    return pathway.creatorId === userId
  }

  // Check team permissions
  return checkTeamPermission(pathway.teamId, userId, ["admin", "editor"])
}

// Check if a user can view a pathway
export async function canViewPathway(pathwayId: string, userId: string): Promise<boolean> {
  const pathway = await prisma.pathway.findUnique({
    where: { id: pathwayId },
    include: {
      team: true,
    },
  })

  if (!pathway) {
    return false
  }

  // If pathway has no team, check if user is the creator
  if (!pathway.teamId) {
    return pathway.creatorId === userId
  }

  // Check team permissions (all roles can view)
  return checkTeamPermission(pathway.teamId, userId, ["admin", "editor", "viewer"])
}

// Log an activity
export async function logActivity(pathwayId: string, userId: string, action: string, details?: any): Promise<void> {
  await prisma.activity.create({
    data: {
      pathway: {
        connect: { id: pathwayId },
      },
      userId,
      action,
      details: details ? details : undefined,
    },
  })
}
