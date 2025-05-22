import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    // Get the authenticated user
    const user = await getUserFromRequest(req)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, phoneNumberId, data } = await req.json()

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: "Pathway name is required" }, { status: 400 })
    }

    // If phoneNumberId is provided, verify it belongs to the user
    if (phoneNumberId) {
      const { data: phoneNumber, error: phoneNumberError } = await supabase
        .from("phone_numbers")
        .select("id")
        .eq("id", phoneNumberId)
        .eq("user_id", user.id)
        .single()

      if (phoneNumberError || !phoneNumber) {
        return NextResponse.json({ error: "Phone number not found or not owned by you" }, { status: 403 })
      }
    }

    // Create the pathway
    const { data: pathway, error } = await supabase
      .from("pathways")
      .insert({
        user_id: user.id,
        name,
        description: description || "",
        phone_number_id: phoneNumberId || null,
        data: data || {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating pathway:", error)
      return NextResponse.json({ error: "Failed to create pathway" }, { status: 500 })
    }

    return NextResponse.json({ success: true, pathway })
  } catch (error) {
    console.error("Error in create-pathway API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
