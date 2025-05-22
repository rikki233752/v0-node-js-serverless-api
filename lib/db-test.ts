import { prisma, connectToDatabase } from "./db"

/**
 * Test the database connection and return status
 */
export async function testDatabaseConnection() {
  try {
    const { success, error } = await connectToDatabase()

    if (!success) {
      return {
        connected: false,
        error: error || "Failed to connect to database",
        tables: [],
      }
    }

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `

    return {
      connected: true,
      tables,
    }
  } catch (error) {
    console.error("Database connection test failed:", error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
      tables: [],
    }
  }
}

/**
 * Get counts of records in each table
 */
export async function getDatabaseStats() {
  try {
    const { success } = await connectToDatabase()

    if (!success) {
      return {
        success: false,
        error: "Failed to connect to database",
        stats: {},
      }
    }

    // Get counts from each table
    const pixelCount = await prisma.pixelConfig.count()
    const eventLogCount = await prisma.eventLog.count()

    return {
      success: true,
      stats: {
        pixelConfigs: pixelCount,
        eventLogs: eventLogCount,
      },
    }
  } catch (error) {
    console.error("Failed to get database stats:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stats: {},
    }
  }
}
