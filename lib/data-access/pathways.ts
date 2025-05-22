import { db, executeDbOperation } from "../db"
import { pathways, activities } from "../schema"
import { eq, desc } from "drizzle-orm"

export async function getPathwayById(id: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(pathways).where(eq(pathways.id, id))
    return result[0] || null
  })
}

export async function getPathwaysByUserId(userId: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(pathways).where(eq(pathways.creatorId, userId))
    return result
  })
}

export async function getPathwaysByTeamId(teamId: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(pathways).where(eq(pathways.teamId, teamId))
    return result
  })
}

export async function createPathway(pathwayData: {
  name: string
  description?: string
  teamId?: string
  creatorId: string
  data: any
  blandId?: string
}) {
  return executeDbOperation(async () => {
    const result = await db
      .insert(pathways)
      .values({
        name: pathwayData.name,
        description: pathwayData.description,
        teamId: pathwayData.teamId,
        creatorId: pathwayData.creatorId,
        updaterId: pathwayData.creatorId, // Initially the same as creator
        data: pathwayData.data,
        blandId: pathwayData.blandId,
      })
      .returning()

    // Log activity
    await db.insert(activities).values({
      userId: pathwayData.creatorId,
      pathwayId: result[0].id,
      teamId: pathwayData.teamId,
      action: "created",
      details: { name: pathwayData.name },
    })

    return result[0]
  })
}

export async function updatePathway(
  id: string,
  pathwayData: {
    name?: string
    description?: string
    teamId?: string
    updaterId: string
    data?: any
    blandId?: string
  },
) {
  return executeDbOperation(async () => {
    const result = await db
      .update(pathways)
      .set({
        ...pathwayData,
        updatedAt: new Date(),
      })
      .where(eq(pathways.id, id))
      .returning()

    // Log activity
    await db.insert(activities).values({
      userId: pathwayData.updaterId,
      pathwayId: id,
      teamId: pathwayData.teamId,
      action: "updated",
      details: { name: pathwayData.name },
    })

    return result[0]
  })
}

export async function deletePathway(id: string, userId: string) {
  return executeDbOperation(async () => {
    // Get pathway info before deleting
    const pathway = await getPathwayById(id)

    if (!pathway.data) {
      return null
    }

    const result = await db.delete(pathways).where(eq(pathways.id, id)).returning()

    // Log activity
    await db.insert(activities).values({
      userId,
      teamId: pathway.data.teamId,
      action: "deleted",
      details: { name: pathway.data.name, id },
    })

    return result[0]
  })
}

export async function getPathwayActivities(pathwayId: string) {
  return executeDbOperation(async () => {
    const result = await db
      .select()
      .from(activities)
      .where(eq(activities.pathwayId, pathwayId))
      .orderBy(desc(activities.createdAt))

    return result
  })
}
