import { db, executeDbOperation } from "../db"
import { teams, teamMembers, users } from "../schema"
import { eq, and } from "drizzle-orm"

export async function getTeamById(id: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(teams).where(eq(teams.id, id))
    return result[0] || null
  })
}

export async function getTeamsByUserId(userId: string) {
  return executeDbOperation(async () => {
    // Get teams where user is owner
    const ownedTeams = await db.select().from(teams).where(eq(teams.ownerId, userId))

    // Get teams where user is a member
    const memberTeams = await db
      .select({
        team: teams,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId))

    // Combine and deduplicate
    const memberTeamsData = memberTeams.map((item) => item.team)
    const allTeams = [...ownedTeams, ...memberTeamsData]

    // Remove duplicates by id
    const uniqueTeams = allTeams.filter((team, index, self) => index === self.findIndex((t) => t.id === team.id))

    return uniqueTeams
  })
}

export async function createTeam(teamData: {
  name: string
  description?: string
  ownerId: string
}) {
  return executeDbOperation(async () => {
    const result = await db
      .insert(teams)
      .values({
        name: teamData.name,
        description: teamData.description,
        ownerId: teamData.ownerId,
      })
      .returning()

    return result[0]
  })
}

export async function updateTeam(
  id: string,
  teamData: {
    name?: string
    description?: string
  },
) {
  return executeDbOperation(async () => {
    const result = await db
      .update(teams)
      .set({ ...teamData, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning()

    return result[0]
  })
}

export async function deleteTeam(id: string) {
  return executeDbOperation(async () => {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning()
    return result[0]
  })
}

export async function getTeamMembers(teamId: string) {
  return executeDbOperation(async () => {
    const members = await db
      .select({
        member: teamMembers,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId))

    return members.map((item) => ({
      ...item.member,
      user: item.user,
    }))
  })
}

export async function addTeamMember(teamId: string, userId: string, role = "editor") {
  return executeDbOperation(async () => {
    const result = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId,
        role,
      })
      .returning()

    return result[0]
  })
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: string) {
  return executeDbOperation(async () => {
    const result = await db
      .update(teamMembers)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning()

    return result[0]
  })
}

export async function removeTeamMember(teamId: string, userId: string) {
  return executeDbOperation(async () => {
    const result = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning()

    return result[0]
  })
}
