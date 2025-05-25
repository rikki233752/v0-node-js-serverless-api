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
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// Create a new PrismaClient instance with connection retry logic
export const prisma =
  globalForPrisma.prisma ??
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
    console.log(`Looking up access token for shop: ${shop}`)

    const result = await executeWithRetry(async () => {
      // Use the correct table name: ShopAuth (capital S, capital A)
      return await prisma.shopAuth.findUnique({
        where: { shop },
        select: { accessToken: true },
      })
    })

    console.log(`Access token found for ${shop}:`, !!result?.accessToken)
    return result?.accessToken || null
  } catch (error) {
    console.error(`Failed to get access token for shop ${shop}:`, error)
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
export async function executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.log(`Database operation failed (attempt ${i + 1}/${maxRetries}):`, error)

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  throw lastError!
}

// Test database connection
export async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log("✅ Database connected successfully")
    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return false
  }
}
