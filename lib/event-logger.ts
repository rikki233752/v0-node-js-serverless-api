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
    await prisma.eventLog.create({
      data: {
        pixelId,
        eventName,
        status,
        response: response ? JSON.stringify(response) : null,
        error: error ? (typeof error === "string" ? error : JSON.stringify(error)) : null,
      },
    })
  } catch (logError) {
    console.error("Failed to log event:", logError)
    // Don't throw - logging should never break the main flow
  }
}
