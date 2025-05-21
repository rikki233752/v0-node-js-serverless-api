import { PrismaClient } from "@prisma/client"

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // Add connection pool configuration
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Export a higher-level function to handle connection errors gracefully
export async function connectToDatabase() {
  try {
    // Test the connection
    await prisma.$connect()
    return { success: true, prisma }
  } catch (error) {
    console.error("Failed to connect to the database:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown database connection error",
    }
  }
}
