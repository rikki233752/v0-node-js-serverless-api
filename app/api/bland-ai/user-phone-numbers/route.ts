import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    // Get the current authenticated user
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Query phone numbers for the current user only
    const { data, error } = await supabase
      .from("phone_numbers")
      .select("*")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false })

    if (error) {
      console.error("Error fetching phone numbers:", error)
      return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 })
    }

    // Return the user's phone numbers
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in user-phone-numbers API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
