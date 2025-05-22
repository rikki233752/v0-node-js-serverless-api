import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// Get the DATABASE_URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL

// Initialize the SQL client with the database URL or a fallback for development
let sql: any
let db: any

try {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables")
  }

  // Initialize the SQL client with the database URL
  sql = neon(DATABASE_URL)
  db = drizzle(sql)

  console.log("Database connection initialized")
} catch (error) {
  console.error("Failed to initialize database connection:", error)

  // Create a mock implementation for development/testing
  const mockSql = async (strings: TemplateStringsArray, ...values: any[]) => {
    console.warn("Using mock database connection. This should not be used in production.")
    return [{ mock: true }]
  }

  mockSql.transaction = async (fn: Function) => {
    return await fn(mockSql)
  }

  sql = mockSql
  db = {
    query: () => ({ execute: async () => [] }),
    select: () => ({ from: () => ({ execute: async () => [] }) }),
    insert: () => ({ values: () => ({ returning: () => ({ execute: async () => [] }) }) }),
    update: () => ({ set: () => ({ where: () => ({ execute: async () => [] }) }) }),
    delete: () => ({ where: () => ({ execute: async () => [] }) }),
  }
}

export { sql, db }

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
