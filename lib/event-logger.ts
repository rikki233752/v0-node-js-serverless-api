import { prisma, executeWithRetry } from "./db"

/**
 * Log an event to the database
 */
export async function logEvent(
  pixelId: string,
  eventName: string,
  status: "success" | "error",
  response?: any,
  error?: any,
): Promise<void> {
  try {
    // Safely stringify objects
    const safeStringify = (obj: any) => {
      if (!obj) return null
      try {
        return typeof obj === "string" ? obj : JSON.stringify(obj)
      } catch (e) {
        console.error("Error stringifying object:", e)
        return JSON.stringify({ error: "Could not stringify object" })
      }
    }

    // Create the event log with retry logic
    await executeWithRetry(async () => {
      await prisma.eventLog.create({
        data: {
          pixelId,
          eventName,
          status,
          payload: safeStringify(response),
          error: safeStringify(error),
        },
      })
    })
  } catch (logError) {
    console.error("Failed to log event:", logError)
    // Don't throw - logging should never break the main flow
  }
}
