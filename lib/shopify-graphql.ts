import { getShopData } from "./db-auth"

export class ShopifyGraphQLClient {
  private shop: string
  private accessToken: string

  constructor(shop: string, accessToken: string) {
    this.shop = shop
    this.accessToken = accessToken
  }

  static async fromShop(shop: string): Promise<ShopifyGraphQLClient> {
    const shopData = await getShopData(shop)
    if (!shopData) {
      throw new Error("Shop not found in database")
    }
    return new ShopifyGraphQLClient(shop, shopData.accessToken)
  }

  async query(query: string, variables: any = {}): Promise<any> {
    const response = await fetch(`https://${this.shop}/admin/api/2023-10/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": this.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    return data.data
  }
}
