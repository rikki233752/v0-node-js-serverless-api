import { type NextRequest, NextResponse } from "next/server"
import { getUserPathways, withUserAuth } from "@/lib/db-utils"
import { supabase } from "@/lib/supabase"

// GET handler to fetch all pathways for the current user
export const GET = withUserAuth(async (req: NextRequest, userId: string) => {
  try {
    const pathways = await getUserPathways(userId)
    return NextResponse.json(pathways)
  } catch (error) {
    console.error("Error in pathways API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
})

// POST handler to create a new pathway
export const POST = withUserAuth(async (req: NextRequest, userId: string) => {
  try {
    const data = await req.json()

    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: "Pathway name is required" }, { status: 400 })
    }

    // Create the pathway in Supabase
    const { data: pathway, error } = await supabase
      .from("pathways")
      .insert({
        name: data.name,
        description: data.description || `Created on ${new Date().toISOString()}`,
        creator_id: userId, // Always associate with the current user
        updater_id: userId,
        team_id: data.team_id || null,
        bland_id: data.bland_id || null,
        data: data.data || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating pathway:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(pathway)
  } catch (error) {
    console.error("Error in pathways API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
})
