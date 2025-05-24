import { NextResponse } from "next/server"
import { getShopData } from "@/lib/db-auth"

export async function POST(request: Request) {
  try {
    console.log("Web Pixel registration request received")

    const body = await request.json()
    const { shop } = body

    console.log("Registration request for shop:", shop)

    if (!shop) {
      console.error("No shop parameter provided")
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 })
    }

    const shopData = await getShopData(shop)

    if (!shopData) {
      console.error("Shop not found in database:", shop)
      return NextResponse.json({ error: "Shop not found in database" }, { status: 404 })
    }

    console.log("Shop data found:", { shop: shopData.shop, installed: shopData.installed })

    // Test basic connectivity first
    console.log("Testing basic shop API access...")
    try {
      const shopTestResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
          "Content-Type": "application/json",
        },
      })

      console.log("Shop test response status:", shopTestResponse.status)

      if (!shopTestResponse.ok) {
        const errorText = await shopTestResponse.text()
        console.error("Shop API test failed:", shopTestResponse.status, errorText)

        return NextResponse.json(
          {
            success: false,
            error: `Cannot access Shopify API. Status: ${shopTestResponse.status}`,
            details: errorText,
            suggestion:
              shopTestResponse.status === 401
                ? "Access token may be invalid. Try reinstalling the app."
                : "Check if the shop domain is correct.",
          },
          { status: shopTestResponse.status },
        )
      }

      const shopTestText = await shopTestResponse.text()
      console.log("Shop test response length:", shopTestText.length)

      if (!shopTestText || shopTestText.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            error: "Shopify API returned empty response",
            suggestion: "This might be a temporary Shopify API issue. Try again in a few minutes.",
          },
          { status: 500 },
        )
      }

      let shopTestData
      try {
        shopTestData = JSON.parse(shopTestText)
        console.log("Shop test successful:", shopTestData.shop?.name || "Unknown shop")
      } catch (parseError) {
        console.error("Failed to parse shop test response:", parseError)
        return NextResponse.json(
          {
            success: false,
            error: "Shopify API returned invalid JSON",
            responseText: shopTestText.substring(0, 500),
            suggestion: "This might be a Shopify API issue or the shop might be temporarily unavailable.",
          },
          { status: 500 },
        )
      }
    } catch (networkError) {
      console.error("Network error testing shop API:", networkError)
      return NextResponse.json(
        {
          success: false,
          error: "Network error connecting to Shopify",
          details: networkError.message,
          suggestion: "Check your internet connection and try again.",
        },
        { status: 500 },
      )
    }

    // Check if the shop has the required scopes
    const requiredScopes = ["read_pixels", "write_pixels"]
    const shopScopes = shopData.scopes ? shopData.scopes.split(",").map((s) => s.trim()) : []

    console.log("Shop scopes:", shopScopes)
    console.log("Required scopes:", requiredScopes)

    const missingScopes = requiredScopes.filter((scope) => !shopScopes.includes(scope))
    if (missingScopes.length > 0) {
      console.error("Missing required scopes:", missingScopes)
      return NextResponse.json(
        {
          success: false,
          error: `Missing required scopes: ${missingScopes.join(", ")}`,
          missingScopes,
          currentScopes: shopScopes,
          suggestion: "Please reinstall the app to grant the required permissions.",
        },
        { status: 400 },
      )
    }

    // Check existing pixels with multiple API versions
    console.log("Checking existing pixels...")
    const apiVersions = ["2023-10", "2023-07", "2023-04"]
    let pixelsApiWorking = false
    let existingPixels = null

    for (const version of apiVersions) {
      try {
        console.log(`Trying pixels API with version ${version}...`)

        const existingPixelsResponse = await fetch(`https://${shop}/admin/api/${version}/pixels.json`, {
          headers: {
            "X-Shopify-Access-Token": shopData.accessToken,
            "Content-Type": "application/json",
          },
        })

        console.log(`Pixels API ${version} response status:`, existingPixelsResponse.status)

        if (existingPixelsResponse.ok) {
          const responseText = await existingPixelsResponse.text()
          console.log(`Pixels API ${version} response length:`, responseText.length)

          if (responseText && responseText.trim() !== "") {
            try {
              existingPixels = JSON.parse(responseText)
              console.log(`Pixels API ${version} successful:`, existingPixels)
              pixelsApiWorking = true
              break
            } catch (parseError) {
              console.error(`Failed to parse pixels response for ${version}:`, parseError)
              continue
            }
          }
        } else if (existingPixelsResponse.status === 404) {
          console.log(`Pixels API ${version} not available (404)`)
          continue
        } else {
          const errorText = await existingPixelsResponse.text()
          console.error(`Pixels API ${version} error:`, existingPixelsResponse.status, errorText)
          continue
        }
      } catch (error) {
        console.error(`Error testing pixels API ${version}:`, error)
        continue
      }
    }

    if (!pixelsApiWorking) {
      return NextResponse.json(
        {
          success: false,
          error: "Pixels API is not available for this store",
          suggestion:
            "This Shopify store plan might not support Web Pixels, or the feature is not enabled. Contact Shopify support or try upgrading your plan.",
        },
        { status: 400 },
      )
    }

    // Check if our pixel already exists
    const ourPixel = existingPixels?.pixels?.find(
      (p) => p.name === "Facebook Pixel Gateway" || p.settings?.accountID === "facebook-pixel-gateway",
    )

    if (ourPixel) {
      console.log("Web Pixel already exists:", ourPixel)
      return NextResponse.json({
        success: true,
        pixel: ourPixel,
        message: "Web Pixel already registered",
        alreadyExists: true,
      })
    }

    // Try to register a new Web Pixel
    const gatewayUrl = process.env.HOST
      ? `${process.env.HOST}/api/track`
      : "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

    // Use minimal pixel configuration
    const pixelData = {
      pixel: {
        name: "Facebook Pixel Gateway",
        settings: {
          accountID: "facebook-pixel-gateway",
        },
      },
    }

    console.log("Registering new Web Pixel with data:", pixelData)

    // Try registration with different API versions
    for (const version of apiVersions) {
      try {
        console.log(`Trying pixel registration with API version ${version}...`)

        const response = await fetch(`https://${shop}/admin/api/${version}/pixels.json`, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": shopData.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pixelData),
        })

        console.log(`Registration API ${version} response status:`, response.status)

        const responseText = await response.text()
        console.log(`Registration API ${version} response length:`, responseText.length)

        if (!responseText || responseText.trim() === "") {
          console.log(`Registration API ${version} returned empty response`)
          continue
        }

        let result
        try {
          result = JSON.parse(responseText)
        } catch (parseError) {
          console.error(`Failed to parse registration response for ${version}:`, parseError)
          continue
        }

        if (response.ok) {
          console.log(`Web Pixel registered successfully with API ${version}:`, result.pixel)
          return NextResponse.json({
            success: true,
            pixel: result.pixel,
            message: `Web Pixel registered successfully using API version ${version}`,
            apiVersion: version,
          })
        } else {
          console.error(`Registration failed with API ${version}:`, response.status, result)

          // If this is the last version, return the error
          if (version === apiVersions[apiVersions.length - 1]) {
            let errorMessage = "Failed to register Web Pixel"
            if (result.errors) {
              if (typeof result.errors === "string") {
                errorMessage = result.errors
              } else if (Array.isArray(result.errors)) {
                errorMessage = result.errors.join(", ")
              } else if (typeof result.errors === "object") {
                errorMessage = JSON.stringify(result.errors)
              }
            }

            return NextResponse.json(
              {
                success: false,
                error: errorMessage,
                details: result,
                shopifyStatus: response.status,
                apiVersionTested: version,
                suggestion:
                  response.status === 403
                    ? "App may not have write_pixels permission"
                    : "Check Shopify Partner Dashboard configuration",
              },
              { status: response.status },
            )
          }
        }
      } catch (error) {
        console.error(`Error with registration API ${version}:`, error)
        continue
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to register Web Pixel with any API version",
        suggestion: "The Pixels API may not be available for this store or there may be a configuration issue.",
      },
      { status: 500 },
    )
  } catch (error) {
    console.error("Error registering Web Pixel:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
