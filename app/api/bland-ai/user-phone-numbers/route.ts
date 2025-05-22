import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    // Get the authenticated user
    const user = await getUserFromRequest(req)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch phone numbers for the current user only
    const { data: phoneNumbers, error } = await supabase
      .from("phone_numbers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching phone numbers:", error)
      return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 })
    }

    return NextResponse.json(phoneNumbers)
  } catch (error) {
    console.error("Error in user-phone-numbers API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
