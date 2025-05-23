import { prisma } from "./db"

/**
 * Log a Shopify event to the database
 */
export async function logShopifyEvent(
  pixelId: string,
  eventName: string,
  shopDomain: string,
  eventData: any,
  status: "success" | "error" = "success",
  error?: any,
): Promise<void> {
  try {
    // Create a safe payload
    const safePayload = {
      shopDomain,
      eventName,
      pixelId,
      timestamp: new Date().toISOString(),
      eventData: JSON.stringify(eventData),
    }

    // Log to console for debugging
    console.log(`Shopify Event: ${eventName} from ${shopDomain}`, safePayload)

    // Create the event log
    await prisma.eventLog.create({
      data: {
        pixelId,
        eventName: `shopify_${eventName}`,
        status,
        payload: JSON.stringify(safePayload),
        error: error ? JSON.stringify(error) : null,
      },
    })
  } catch (logError) {
    console.error("Failed to log Shopify event:", logError)
    // Don't throw - logging should never break the main flow
  }
}
