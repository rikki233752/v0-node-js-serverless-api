// lib/db.ts

import { prisma } from "./prisma"

export async function updateShopPixelId(shopDomain: string, pixelId: string) {
  try {
    console.log(`🔄 [DB] Updating pixel ID for shop: ${shopDomain}`)

    const shop = await prisma.shop.update({
      where: { domain: shopDomain },
      data: { pixelId: pixelId },
    })

    console.log(`✅ [DB] Successfully updated pixel ID for shop: ${shopDomain}`)
    return shop
  } catch (error) {
    console.error(`❌ [DB] Error updating pixel ID for shop:`, error)
    throw error
  }
}
