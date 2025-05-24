import { PrismaClient } from "@prisma/client"

// Define a custom logger for Prisma
const prismaLogger = [
  {
    emit: "event",
    level: "query",
  },
  {
    emit: "event",
    level: "error",
  },
  {
    emit: "stdout",
    level: "error",
  },
  {
    emit: "stdout",
    level: "info",
  },
  {
    emit: "stdout",
    level: "warn",
  },
]

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Create a new PrismaClient instance with connection retry logic
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? prismaLogger : ["error"],
    datasources: {
      db: {
        // Use the DATABASE_URL environment variable
        url: process.env.DATABASE_URL,
      },
    },
  })

// Add event listeners for better debugging
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    console.log("Query: " + e.query)
    console.log("Duration: " + e.duration + "ms")
  })

  prisma.$on("error", (e) => {
    console.error("Prisma Error:", e)
  })
}

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Helper function to get shop access token from database
export async function getShopAccessToken(shop: string): Promise<string | null> {
  try {
    const result = await executeWithRetry(async () => {
      // Try multiple possible table names based on our schema
      try {
        // First try shopAuth table (from lib/db-auth.ts)
        return await prisma.shopAuth.findUnique({
          where: { shop },
          select: { accessToken: true },
        })
      } catch (error) {
        // If shopAuth doesn't exist, try shopifyStore
        return await prisma.shopifyStore.findUnique({
          where: { shop },
          select: { accessToken: true },
        })
      }
    })

    return result?.accessToken || null
  } catch (error) {
    console.error(`Failed to get access token for shop ${shop}:`, error)

    // Debug: Let's see what tables exist
    console.log("Available tables in database:")
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
      console.log("Tables:", tables)
    } catch (e) {
      console.log("Could not list tables:", e)
    }

    return null
  }
}

// Connection function with retry logic
export async function connectToDatabase(retries = 3, delay = 1000) {
  let currentTry = 0

  while (currentTry < retries) {
    try {
      // Test the connection
      await prisma.$connect()
      console.log("Successfully connected to the database")
      return { success: true, prisma }
    } catch (error) {
      currentTry++
      console.error(`Database connection attempt ${currentTry}/${retries} failed:`, error)

      if (currentTry >= retries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown database connection error",
          prisma: null,
        }
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
      // Increase delay for next retry (exponential backoff)
      delay *= 2
    }
  }

  return {
    success: false,
    error: "Maximum connection retries exceeded",
    prisma: null,
  }
}

// Helper function to safely execute database operations
export async function executeWithRetry<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let currentTry = 0
  let lastError: any

  while (currentTry < retries) {
    try {
      return await operation()
    } catch (error: any) {
      currentTry++
      lastError = error
      console.error(`Database operation attempt ${currentTry}/${retries} failed:`, error)

      // Check if this is a connection error that we should retry
      const isConnectionError =
        error.message.includes("Connection") ||
        error.message.includes("timeout") ||
        error.message.includes("closed") ||
        error.code === "P1001" ||
        error.code === "P1002"

      if (currentTry >= retries || !isConnectionError) {
        throw error
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
      // Increase delay for next retry (exponential backoff)
      delay *= 2
    }
  }

  throw lastError
}
