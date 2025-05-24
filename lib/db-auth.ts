import { prisma } from "./db"

export interface ShopData {
  shop: string
  accessToken: string
  scopes?: string
  installed: boolean
}

/**
 * Stores shop data in database and creates initial shop config
 */
export async function storeShopData(shopData: ShopData): Promise<void> {
  // Store in ShopAuth table
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

  // AUTOMATICALLY create ShopConfig entry for new installations
  const cleanShop = shopData.shop
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase()

  await prisma.shopConfig.upsert({
    where: { shopDomain: cleanShop },
    update: {
      // Update existing config if shop reinstalls
      gatewayEnabled: true,
      updatedAt: new Date(),
    },
    create: {
      shopDomain: cleanShop,
      gatewayEnabled: false, // Disabled until customer adds their pixel ID
      pixelConfigId: null, // No pixel configured yet
    },
  })

  console.log("✅ Shop config automatically created for:", cleanShop)
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

/**
 * Gets shop configuration status
 */
export async function getShopConfigStatus(shop: string) {
  const cleanShop = shop
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase()

  const shopConfig = await prisma.shopConfig.findUnique({
    where: { shopDomain: cleanShop },
    include: { pixelConfig: true },
  })

  return {
    exists: !!shopConfig,
    configured: !!shopConfig?.pixelConfig,
    gatewayEnabled: shopConfig?.gatewayEnabled || false,
    pixelId: shopConfig?.pixelConfig?.pixelId || null,
    pixelName: shopConfig?.pixelConfig?.name || null,
  }
}
