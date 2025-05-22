import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// Get the DATABASE_URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not defined in environment variables")
}

// Initialize the SQL client with the database URL
const sql = neon(DATABASE_URL!)
export const db = drizzle(sql)

// Test the database connection
export async function testDatabaseConnection() {
  try {
    // Simple query to test the connection
    const result = await sql`SELECT 1 as test`
    console.log("Database connection successful")
    return { success: true, message: "Database connection successful", result }
  } catch (error) {
    console.error("Database connection error:", error)
    return {
      success: false,
      message: "Failed to connect to database",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Generic function to handle database errors
export async function executeDbOperation<T>(
  operation: () => Promise<T>,
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    console.error("Database operation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
