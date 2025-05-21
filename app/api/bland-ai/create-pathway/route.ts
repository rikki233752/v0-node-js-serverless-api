import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, name, description } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ status: "error", message: "API key is required" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ status: "error", message: "Pathway name is required" }, { status: 400 })
    }

    // Get the current user from Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      },
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 })
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

    // Store the pathway in Supabase
    const { error: supabaseError } = await supabase.from("pathways").insert({
      user_id: session.user.id,
      name,
      description: description || `Created on ${new Date().toISOString()}`,
      bland_pathway_id: data.id,
      is_published: false,
    })

    if (supabaseError) {
      console.error("Error storing pathway in Supabase:", supabaseError)
      // Continue anyway since the Bland.ai pathway was created successfully
    }

    return NextResponse.json({
      status: "success",
      message: "Pathway created successfully",
      data,
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
