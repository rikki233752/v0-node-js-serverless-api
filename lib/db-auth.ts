import { prisma } from "@/lib/prisma"

export interface ShopData {
  shop: string
  accessToken: string
  scopes?: string
  installed: boolean
}

/**
 * Authenticates an admin user
 */
export async function authenticateAdmin(username: string, password: string): Promise<boolean> {
  const adminUsername = process.env.ADMIN_USERNAME
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminUsername || !adminPassword) {
    console.error("Admin credentials not configured")
    return false
  }

  return username === adminUsername && password === adminPassword
}

/**
 * Stores shop data in the database
 */
export async function storeShopData({
  shop,
  accessToken,
  scopes,
  installed,
}: {
  shop: string
  accessToken: string
  scopes: string
  installed: boolean
}): Promise<void> {
  try {
    await prisma.shopAuth.upsert({
      where: { shop },
      update: {
        accessToken,
        scopes,
        installed,
        updatedAt: new Date(),
      },
      create: {
        shop,
        accessToken,
        scopes,
        installed,
      },
    })
  } catch (error) {
    console.error("Error storing shop data:", error)
    throw error
  }
}

/**
 * Retrieves shop data from database
 */
export async function getShopData(shop: string): Promise<ShopData | null> {
  try {
    const shopData = await prisma.shopAuth.findUnique({
      where: { shop },
    })

    if (!shopData) return null

    return {
      shop: shopData.shop,
      accessToken: shopData.accessToken,
      scopes: shopData.scopes || "",
      installed: shopData.installed,
    }
  } catch (error) {
    console.error("Error getting shop data:", error)
    return null
  }
}
