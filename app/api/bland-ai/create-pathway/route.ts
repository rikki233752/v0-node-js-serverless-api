import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Get the current authenticated user
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { apiKey, name, description, phoneNumberId } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ status: "error", message: "API key is required" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ status: "error", message: "Pathway name is required" }, { status: 400 })
    }

    // Log the request for debugging
    console.log("Creating pathway:", { name, description })

    // Create a new pathway in Bland.ai - FIXED PAYLOAD
    const response = await fetch("https://api.bland.ai/v1/pathway/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name,
        description: description || `Created on ${new Date().toISOString()}`,
        // Removed nodes and edges from initial creation
      }),
    })

    // Check content type before trying to parse as JSON
    const contentType = response.headers.get("content-type")

    if (!contentType || !contentType.includes("application/json")) {
      // Not JSON, get the raw text
      const rawResponse = await response.text()
      return NextResponse.json(
        {
          status: "error",
          message: "Non-JSON response received from API",
          responseStatus: response.status,
          responseStatusText: response.statusText,
          rawResponse: rawResponse.substring(0, 1000), // First 1000 chars for debugging
          requestDetails: {
            url: "https://api.bland.ai/v1/pathway/create",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer API_KEY_REDACTED",
            },
            body: JSON.stringify({
              name,
              description: description || `Created on ${new Date().toISOString()}`,
            }),
          },
        },
        { status: response.status },
      )
    }

    // Now it's safe to parse as JSON
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: data.message || "Error creating pathway",
          details: data,
          requestDetails: {
            url: "https://api.bland.ai/v1/pathway/create",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer API_KEY_REDACTED",
            },
            body: JSON.stringify({
              name,
              description: description || `Created on ${new Date().toISOString()}`,
            }),
          },
        },
        { status: response.status },
      )
    }

    // Store the pathway in the database with user_id and phone_number_id
    const { error: dbError } = await supabase.from("pathways").insert({
      user_id: user.id, // Associate with the current user
      phone_number_id: phoneNumberId || null,
      name,
      description: description || `Created on ${new Date().toISOString()}`,
      bland_id: data.id || null,
      data: {}, // Empty data initially
      creator_id: user.id,
      updater_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error("Error storing pathway in database:", dbError)
      return NextResponse.json(
        {
          status: "error",
          message: "Pathway created in Bland.ai but failed to store in database",
          error: dbError,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      status: "success",
      message: "Pathway created successfully",
      data: {
        ...data,
        user_id: user.id, // Include user_id in the response for debugging
      },
    })
  } catch (error) {
    console.error("Error creating pathway:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
