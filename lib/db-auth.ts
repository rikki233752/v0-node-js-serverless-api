import { prisma } from "./db"

export interface ShopData {
  shop: string
  accessToken: string
  scopes?: string
  installed: boolean
}

/**
 * Stores shop data in database
 */
export async function storeShopData(shopData: ShopData): Promise<void> {
  await prisma.shopAuth.upsert({
    where: { shop: shopData.shop },
    update: {
      accessToken: shopData.accessToken,
      scopes: shopData.scopes || process.env.SHOPIFY_SCOPES,
      installed: shopData.installed,
    },
    create: {
      shop: shopData.shop,
      accessToken: shopData.accessToken,
      scopes: shopData.scopes || process.env.SHOPIFY_SCOPES,
      installed: shopData.installed,
    },
  })
}

/**
 * Retrieves shop data from database
 */
export async function getShopData(shop: string): Promise<ShopData | null> {
  const shopData = await prisma.shopAuth.findUnique({
    where: { shop },
  })

  if (!shopData) return null

  return {
    shop: shopData.shop,
    accessToken: shopData.accessToken,
    scopes: shopData.scopes,
    installed: shopData.installed,
  }
}

/**
 * Checks if shop has been installed and authenticated
 */
export async function isShopInstalled(shop: string): Promise<boolean> {
  const shopData = await getShopData(shop)
  return !!shopData?.installed
}
