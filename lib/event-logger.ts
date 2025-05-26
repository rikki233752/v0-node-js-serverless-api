import { prisma, executeWithRetry } from "./db"

/**
 * Log an event to the database
 */
export async function logEvent(
  pixelId: string,
  eventName: string,
  status: "success" | "error" | "received" | "processed",
  response?: any,
  error?: any,
): Promise<void> {
  try {
    console.log(`📝 [Event Logger] Logging ${eventName} event for pixel ${pixelId} with status ${status}`)

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
      const result = await prisma.eventLog.create({
        data: {
          pixelId,
          eventName,
          status,
          payload: safeStringify(response),
          error: safeStringify(error),
        },
      })
      console.log(`✅ [Event Logger] Successfully logged event with ID: ${result.id}`)
      return result
    }, 3)
  } catch (logError) {
    console.error("💥 [Event Logger] Failed to log event:", logError)

    // Last resort: try a direct database write without the retry wrapper
    try {
      await prisma.eventLog.create({
        data: {
          pixelId,
          eventName: `${eventName}_recovery`,
          status: "error",
          payload: JSON.stringify({ original_event: eventName }),
          error: JSON.stringify({
            message: "Error in event logger",
            details: logError instanceof Error ? logError.message : String(logError),
          }),
        },
      })
      console.log(`⚠️ [Event Logger] Created recovery log entry`)
    } catch (finalError) {
      console.error(`💥 [Event Logger] Complete failure to log event:`, finalError)
    }
  }
}

/**
 * Test the event logging system
 */
export async function testEventLogging(): Promise<{ success: boolean; message: string }> {
  try {
    const testEvent = await prisma.eventLog.create({
      data: {
        pixelId: "test_pixel_id",
        eventName: "test_event",
        status: "success",
        payload: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      },
    })

    return {
      success: true,
      message: `Test event logged successfully with ID: ${testEvent.id}`,
    }
  } catch (error) {
    console.error("Failed to log test event:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
