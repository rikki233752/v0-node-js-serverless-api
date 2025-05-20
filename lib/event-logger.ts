import { prisma } from "./db"

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

    await prisma.eventLog.create({
      data: {
        pixelId,
        eventName,
        status,
        response: safeStringify(response),
        error: safeStringify(error),
        // Add additional metadata if available in the response
        metadata: safeStringify({
          event_id: response?.event_id || error?.event_id,
          event_source_url: response?.event_source_url || error?.event_source_url,
          timestamp: new Date().toISOString(),
        }),
      },
    })
  } catch (logError) {
    console.error("Failed to log event:", logError)
    // Don't throw - logging should never break the main flow
  }
}
