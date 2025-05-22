import { db, executeDbOperation } from "../db"
import { calls, callAnalytics } from "../schema"
import { eq, desc } from "drizzle-orm"

export async function getCallById(id: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(calls).where(eq(calls.id, id))
    return result[0] || null
  })
}

export async function getCallsByUserId(userId: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(calls).where(eq(calls.userId, userId)).orderBy(desc(calls.startTime))

    return result
  })
}

export async function getCallsByTeamId(teamId: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(calls).where(eq(calls.teamId, teamId)).orderBy(desc(calls.startTime))

    return result
  })
}

export async function getCallsByPhoneNumber(phoneNumber: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(calls).where(eq(calls.toNumber, phoneNumber)).orderBy(desc(calls.startTime))

    return result
  })
}

export async function createCall(callData: {
  fromNumber: string
  toNumber: string
  pathwayId?: string
  pathwayName?: string
  status: string
  duration: number
  userId?: string
  teamId?: string
  blandCallId?: string
  recording?: string
}) {
  return executeDbOperation(async () => {
    const result = await db
      .insert(calls)
      .values({
        fromNumber: callData.fromNumber,
        toNumber: callData.toNumber,
        pathwayId: callData.pathwayId,
        pathwayName: callData.pathwayName,
        status: callData.status,
        duration: callData.duration,
        userId: callData.userId,
        teamId: callData.teamId,
        blandCallId: callData.blandCallId,
        recording: callData.recording,
      })
      .returning()

    return result[0]
  })
}

export async function updateCallStatus(id: string, status: string, endTime?: Date) {
  return executeDbOperation(async () => {
    const updateData: any = { status }

    if (endTime) {
      updateData.endTime = endTime

      // Calculate duration if we have start and end time
      const call = await getCallById(id)
      if (call.data && call.data.startTime) {
        const startTime = new Date(call.data.startTime)
        const durationMs = endTime.getTime() - startTime.getTime()
        updateData.duration = Math.floor(durationMs / 1000) // Convert to seconds
      }
    }

    const result = await db.update(calls).set(updateData).where(eq(calls.id, id)).returning()

    return result[0]
  })
}

export async function saveCallAnalytics(
  callId: string,
  analyticsData: {
    transcript?: string
    summary?: string
    sentiment?: string
    keywords?: string[]
    intent?: string
  },
) {
  return executeDbOperation(async () => {
    const result = await db
      .insert(callAnalytics)
      .values({
        callId,
        transcript: analyticsData.transcript,
        summary: analyticsData.summary,
        sentiment: analyticsData.sentiment,
        keywords: analyticsData.keywords,
        intent: analyticsData.intent,
      })
      .returning()

    return result[0]
  })
}

export async function getCallAnalytics(callId: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(callAnalytics).where(eq(callAnalytics.callId, callId))
    return result[0] || null
  })
}
