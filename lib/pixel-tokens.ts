import { prisma } from "./db"

// Interface for pixel configuration
export interface PixelConfig {
  pixelId: string
  accessToken: string
  name?: string
  clientId?: string
}

// Environment variable fallback
const DEFAULT_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || ""
const DEFAULT_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || ""

/**
 * Get access token for a given pixel ID
 */
export async function getAccessToken(pixelId: string): Promise<string | null> {
  try {
    // First check the database
    const pixelConfig = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    if (pixelConfig) {
      return pixelConfig.accessToken
    }

    // If the requested pixel ID matches the default pixel ID, return the default token
    if (pixelId === DEFAULT_PIXEL_ID && DEFAULT_ACCESS_TOKEN) {
      return DEFAULT_ACCESS_TOKEN
    }

    // No token found for this pixel ID
    return null
  } catch (error) {
    console.error("Error retrieving access token:", error)

    // Fallback to environment variables in case of database error
    if (pixelId === DEFAULT_PIXEL_ID && DEFAULT_ACCESS_TOKEN) {
      return DEFAULT_ACCESS_TOKEN
    }

    return null
  }
}

/**
 * Add a new pixel configuration
 */
export async function addPixelConfig(config: PixelConfig): Promise<void> {
  await prisma.pixelConfig.upsert({
    where: { pixelId: config.pixelId },
    update: {
      accessToken: config.accessToken,
      name: config.name,
      clientId: config.clientId,
    },
    create: {
      pixelId: config.pixelId,
      accessToken: config.accessToken,
      name: config.name,
      clientId: config.clientId,
    },
  })
}

/**
 * Get all pixel configurations
 */
export async function getAllPixelConfigs(): Promise<PixelConfig[]> {
  const configs = await prisma.pixelConfig.findMany({
    orderBy: { createdAt: "desc" },
  })

  return configs.map((config) => ({
    pixelId: config.pixelId,
    accessToken: config.accessToken,
    name: config.name || undefined,
    clientId: config.clientId || undefined,
  }))
}

/**
 * Remove a pixel configuration
 */
export async function removePixelConfig(pixelId: string): Promise<boolean> {
  try {
    await prisma.pixelConfig.delete({
      where: { pixelId },
    })
    return true
  } catch (error) {
    console.error("Error removing pixel configuration:", error)
    return false
  }
}
