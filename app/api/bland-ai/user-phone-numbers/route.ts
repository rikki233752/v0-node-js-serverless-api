import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET() {
  try {
    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    // Fetch phone numbers for the current user
    const { data: phoneNumbers, error } = await supabase
      .from("phone_numbers")
      .select("*, pathways(id, name)")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false })

    if (error) {
      console.error("Error fetching user phone numbers:", error)
      return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 })
    }

    // Format the phone numbers for the frontend
    const formattedNumbers = phoneNumbers.map((phone) => ({
      id: phone.id,
      number: phone.number,
      location: phone.location,
      type: phone.type,
      status: phone.status,
      purchaseDate: phone.purchased_at,
      monthlyFee: `$${phone.monthly_fee.toFixed(2)}`,
      assignedTo: phone.pathways?.name || "Unassigned",
      pathway_id: phone.pathway_id,
    }))

    return NextResponse.json(formattedNumbers)
  } catch (error) {
    console.error("Error fetching user phone numbers:", error)
    return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 })
  }
}
