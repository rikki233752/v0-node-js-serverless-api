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
          error: `Missing required scopes: ${missingScopes.join(", ")}. Please reinstall the app with proper permissions.`,
          missingScopes,
          currentScopes: shopScopes,
        },
        { status: 400 },
      )
    }

    // First, let's check what pixels already exist
    console.log("Checking existing pixels...")
    try {
      const existingPixelsResponse = await fetch(`https://${shop}/admin/api/2023-10/pixels.json`, {
        headers: {
          "X-Shopify-Access-Token": shopData.accessToken,
          "Content-Type": "application/json",
        },
      })

      console.log("Existing pixels response status:", existingPixelsResponse.status)
      console.log("Existing pixels response headers:", Object.fromEntries(existingPixelsResponse.headers.entries()))

      if (existingPixelsResponse.ok) {
        const responseText = await existingPixelsResponse.text()
        console.log("Existing pixels response text:", responseText)

        let existingPixels
        try {
          existingPixels = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Failed to parse existing pixels response:", parseError)
          return NextResponse.json(
            {
              success: false,
              error: "Invalid response from Shopify API when checking existing pixels",
              details: responseText,
            },
            { status: 500 },
          )
        }

        console.log("Existing pixels:", existingPixels)

        // Check if our pixel already exists
        const ourPixel = existingPixels.pixels?.find(
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
      } else {
        const errorText = await existingPixelsResponse.text()
        console.error("Failed to fetch existing pixels:", existingPixelsResponse.status, errorText)

        // If we can't read pixels, we might not have the right permissions
        if (existingPixelsResponse.status === 403) {
          return NextResponse.json(
            {
              success: false,
              error: "Access denied when checking existing pixels. Please ensure the app has 'read_pixels' scope.",
              shopifyStatus: existingPixelsResponse.status,
              details: errorText,
            },
            { status: 403 },
          )
        }
      }
    } catch (checkError) {
      console.error("Error checking existing pixels:", checkError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to check existing pixels",
          details: checkError.message,
        },
        { status: 500 },
      )
    }

    // Try to register a new Web Pixel with Shopify
    const gatewayUrl = process.env.HOST
      ? `${process.env.HOST}/api/track`
      : "https://v0-node-js-serverless-api-lake.vercel.app/api/track"

    // Use a simpler pixel configuration that's more likely to work
    const pixelData = {
      pixel: {
        name: "Facebook Pixel Gateway",
        settings: {
          accountID: "facebook-pixel-gateway",
        },
      },
    }

    console.log("Registering new Web Pixel with data:", pixelData)
    console.log("Using gateway URL:", gatewayUrl)

    const response = await fetch(`https://${shop}/admin/api/2023-10/pixels.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopData.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pixelData),
    })

    console.log("Shopify API response status:", response.status)
    console.log("Shopify API response headers:", Object.fromEntries(response.headers.entries()))

    // Get the response text first, then try to parse it
    const responseText = await response.text()
    console.log("Shopify API response text:", responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse Shopify API response:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid response from Shopify API",
          shopifyStatus: response.status,
          responseText: responseText,
          parseError: parseError.message,
        },
        { status: 500 },
      )
    }

    console.log("Shopify API parsed response:", result)

    if (response.ok) {
      console.log("Web Pixel registered successfully:", result.pixel)
      return NextResponse.json({
        success: true,
        pixel: result.pixel,
        message: "Web Pixel registered successfully",
      })
    } else {
      console.error("Shopify API error:", response.status, result)

      // Provide more specific error messages
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

      // Check for specific error cases
      if (response.status === 403) {
        errorMessage = "Access denied. Please ensure the app has 'write_pixels' scope and is properly installed."
      } else if (response.status === 404) {
        errorMessage = "Pixels API endpoint not found. This Shopify plan might not support Web Pixels."
      } else if (response.status === 422) {
        errorMessage = "Invalid pixel data. " + errorMessage
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: result,
          shopifyStatus: response.status,
          responseText: responseText,
        },
        { status: response.status },
      )
    }
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
