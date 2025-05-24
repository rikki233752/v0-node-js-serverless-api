import { NextResponse } from "next/server"
import { getShopData } from "@/lib/db-auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get("shop")

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    const shopData = await getShopData(shop)

    if (!shopData) {
      return NextResponse.json({ error: "Shop not found in database" }, { status: 404 })
    }

    console.log("Checking store capabilities for shop:", shop)

    const results = {
      shop: shop,
      scopes: shopData.scopes,
      capabilities: {},
      recommendations: [],
    }

    // Get shop details
    try {
      const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      if (shopResponse.ok) {
        const shopResponseText = await shopResponse.text()
        const shopResult = JSON.parse(shopResponseText)

        results.shopDetails = {
          name: shopResult.shop?.name,
          domain: shopResult.shop?.domain,
          plan_name: shopResult.shop?.plan_name,
          plan_display_name: shopResult.shop?.plan_display_name,
          country_name: shopResult.shop?.country_name,
          created_at: shopResult.shop?.created_at,
          updated_at: shopResult.shop?.updated_at,
          currency: shopResult.shop?.currency,
          money_format: shopResult.shop?.money_format,
          setup_required: shopResult.shop?.setup_required,
        }

        // Check if it's a development store
        const isDevelopmentStore =
          shopResult.shop?.plan_name === "partner_test" ||
          shopResult.shop?.plan_name === "development" ||
          shopResult.shop?.plan_display_name?.toLowerCase().includes("development")

        results.capabilities.isDevelopmentStore = isDevelopmentStore

        if (isDevelopmentStore) {
          results.recommendations.push(
            "Development stores have limited API access. Consider using a paid Shopify plan for full Web Pixels support.",
          )
        }
      }
    } catch (error) {
      console.error("Error fetching shop details:", error)
    }

    // Test Web Pixels API availability
    const apiVersions = ["2023-10", "2023-07", "2023-04", "2023-01", "2022-10"]
    results.capabilities.pixelsApi = {}

    for (const version of apiVersions) {
      try {
        const pixelsResponse = await fetch(`https://${shop}/admin/api/${version}/pixels.json`, {
          headers: {
            "X-Shopify-Access-Token": shopData.accessToken,
          },
        })

        results.capabilities.pixelsApi[version] = {
          status: pixelsResponse.status,
          available: pixelsResponse.ok,
          error: pixelsResponse.ok ? null : await pixelsResponse.text(),
        }

        if (pixelsResponse.ok) {
          const pixelsData = await pixelsResponse.json()
          results.capabilities.pixelsApi[version].pixelCount = pixelsData.pixels?.length || 0
          break // Found working version
        }
      } catch (error) {
        results.capabilities.pixelsApi[version] = {
          status: 0,
          available: false,
          error: error.message,
        }
      }
    }

    // Test Script Tags API (alternative)
    try {
      const scriptTagsResponse = await fetch(`https://${shop}/admin/api/2023-10/script_tags.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      results.capabilities.scriptTags = {
        available: scriptTagsResponse.ok,
        status: scriptTagsResponse.status,
      }

      if (scriptTagsResponse.ok) {
        const scriptTagsData = await scriptTagsResponse.json()
        results.capabilities.scriptTags.count = scriptTagsData.script_tags?.length || 0
        results.recommendations.push("Script Tags API is available as an alternative to Web Pixels for tracking.")
      }
    } catch (error) {
      results.capabilities.scriptTags = {
        available: false,
        error: error.message,
      }
    }

    // Test Webhooks API
    try {
      const webhooksResponse = await fetch(`https://${shop}/admin/api/2023-10/webhooks.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      results.capabilities.webhooks = {
        available: webhooksResponse.ok,
        status: webhooksResponse.status,
      }

      if (webhooksResponse.ok) {
        const webhooksData = await webhooksResponse.json()
        results.capabilities.webhooks.count = webhooksData.webhooks?.length || 0
        results.recommendations.push("Webhooks API is available for server-side event tracking.")
      }
    } catch (error) {
      results.capabilities.webhooks = {
        available: false,
        error: error.message,
      }
    }

    // Check available scopes
    const requiredScopes = ["read_pixels", "write_pixels", "read_script_tags", "write_script_tags"]
    const availableScopes = shopData.scopes ? shopData.scopes.split(",").map((s) => s.trim()) : []

    results.capabilities.scopes = {
      available: availableScopes,
      required: requiredScopes,
      missing: requiredScopes.filter((scope) => !availableScopes.includes(scope)),
    }

    // Generate recommendations
    if (results.capabilities.scopes.missing.length > 0) {
      results.recommendations.push(
        `Missing scopes: ${results.capabilities.scopes.missing.join(", ")}. Reinstall the app to grant these permissions.`,
      )
    }

    if (
      !results.capabilities.pixelsApi ||
      Object.values(results.capabilities.pixelsApi).every((api) => !api.available)
    ) {
      results.recommendations.push(
        "Web Pixels API is not available. Consider using Script Tags or Webhooks as alternatives.",
      )
    }

    if (results.capabilities.scriptTags?.available) {
      results.recommendations.push(
        "You can use Script Tags to inject Facebook Pixel tracking code directly into your store.",
      )
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error("Error checking store capabilities:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
