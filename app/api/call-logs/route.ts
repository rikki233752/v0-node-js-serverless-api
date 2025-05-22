import { type NextRequest, NextResponse } from "next/server"
import { withUserAuth } from "@/lib/db-utils"
import { supabase } from "@/lib/supabase"

// GET handler to fetch call logs for a specific phone number
export const GET = withUserAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url)
    const phoneNumberId = searchParams.get("phoneNumberId")

    if (!phoneNumberId) {
      return NextResponse.json({ error: "Phone number ID is required" }, { status: 400 })
    }

    // Verify the phone number belongs to the user
    const { data: phoneNumber, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("id")
      .eq("id", phoneNumberId)
      .eq("user_id", userId)
      .single()

    if (phoneError || !phoneNumber) {
      return NextResponse.json({ error: "Phone number not found or not owned by user" }, { status: 404 })
    }

    // Fetch call logs for the phone number
    const { data: callLogs, error } = await supabase
      .from("call_logs")
      .select("*")
      .eq("phone_number_id", phoneNumberId)
      .order("started_at", { ascending: false })

    if (error) {
      console.error("Error fetching call logs:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(callLogs)
  } catch (error) {
    console.error("Error in call-logs API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
})
