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

    console.log("Testing Shopify API access for shop:", shop)

    const results = {
      shop: shop,
      scopes: shopData.scopes,
      accessTokenLength: shopData.accessToken.length,
      tests: {},
    }

    // Test 1: Basic shop access
    try {
      const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      console.log("Shop API test - Status:", shopResponse.status)

      const shopResponseText = await shopResponse.text()
      console.log("Shop API test - Response length:", shopResponseText.length)

      results.tests.shopApi = {
        status: shopResponse.status,
        success: shopResponse.ok,
        responseLength: shopResponseText.length,
        hasContent: shopResponseText.trim() !== "",
      }

      if (shopResponse.ok && shopResponseText.trim() !== "") {
        try {
          const shopResult = JSON.parse(shopResponseText)
          results.tests.shopApi.data = {
            name: shopResult.shop?.name,
            domain: shopResult.shop?.domain,
            plan: shopResult.shop?.plan_name,
          }
        } catch (parseError) {
          results.tests.shopApi.parseError = parseError.message
          results.tests.shopApi.responsePreview = shopResponseText.substring(0, 200)
        }
      } else {
        results.tests.shopApi.errorText = shopResponseText.substring(0, 200)
      }
    } catch (error) {
      results.tests.shopApi = {
        error: error.message,
        success: false,
      }
    }

    // Test 2: Pixels API with multiple versions
    const apiVersions = ["2023-10", "2023-07", "2023-04", "2023-01"]
    results.tests.pixelsApi = {}

    for (const version of apiVersions) {
      try {
        const pixelsResponse = await fetch(`https://${shop}/admin/api/${version}/pixels.json`, {
          headers: {
            "X-Shopify-Access-Token": shopData.accessToken,
          },
        })

        const pixelsResponseText = await pixelsResponse.text()

        results.tests.pixelsApi[version] = {
          status: pixelsResponse.status,
          success: pixelsResponse.ok,
          responseLength: pixelsResponseText.length,
          hasContent: pixelsResponseText.trim() !== "",
        }

        if (pixelsResponse.ok && pixelsResponseText.trim() !== "") {
          try {
            const pixelsResult = JSON.parse(pixelsResponseText)
            results.tests.pixelsApi[version].pixelCount = pixelsResult.pixels?.length || 0
            results.tests.pixelsApi[version].pixels =
              pixelsResult.pixels?.map((p) => ({
                id: p.id,
                name: p.name,
                status: p.status,
              })) || []
          } catch (parseError) {
            results.tests.pixelsApi[version].parseError = parseError.message
            results.tests.pixelsApi[version].responsePreview = pixelsResponseText.substring(0, 200)
          }
        } else {
          results.tests.pixelsApi[version].errorText = pixelsResponseText.substring(0, 200)
        }
      } catch (error) {
        results.tests.pixelsApi[version] = {
          error: error.message,
          success: false,
        }
      }
    }

    // Test 3: Check if any pixels API version works
    const workingPixelsApi = Object.entries(results.tests.pixelsApi).find(([version, test]) => test.success)
    results.pixelsApiAvailable = !!workingPixelsApi
    results.workingPixelsApiVersion = workingPixelsApi?.[0]

    // Test 4: Network connectivity test
    try {
      const connectivityTest = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
        method: "HEAD",
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
        },
      })

      results.tests.connectivity = {
        status: connectivityTest.status,
        success: connectivityTest.ok,
        headers: Object.fromEntries(connectivityTest.headers.entries()),
      }
    } catch (error) {
      results.tests.connectivity = {
        error: error.message,
        success: false,
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error("Error testing Shopify API:", error)
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
