import { type NextRequest, NextResponse } from "next/server"
import { getUserPhoneNumbers, withUserAuth } from "@/lib/db-utils"
import { supabase } from "@/lib/supabase" // Declare the supabase variable

// GET handler to fetch all phone numbers for the current user
export const GET = withUserAuth(async (req: NextRequest, userId: string) => {
  try {
    const phoneNumbers = await getUserPhoneNumbers(userId)
    return NextResponse.json(phoneNumbers)
  } catch (error) {
    console.error("Error in phone-numbers API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
})

// POST handler to create a new phone number
export const POST = withUserAuth(async (req: NextRequest, userId: string) => {
  try {
    const data = await req.json()

    // Validate required fields
    if (!data.number) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Create the phone number in Supabase
    const { data: phoneNumber, error } = await supabase
      .from("phone_numbers")
      .insert({
        user_id: userId, // Always associate with the current user
        number: data.number,
        location: data.location || "Unknown",
        type: data.type || "Voice",
        status: data.status || "Active",
        monthly_fee: data.monthly_fee || 1.0,
        purchased_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating phone number:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(phoneNumber)
  } catch (error) {
    console.error("Error in phone-numbers API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
})
