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

    const url = new URL(req.url)
    const phoneNumber = url.searchParams.get("phoneNumber")
    const dateRange = url.searchParams.get("dateRange") || "month"

    // Calculate date ranges
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Base query to get only the current user's phone numbers
    let phoneNumbersQuery = supabase.from("phone_numbers").select("id").eq("user_id", user.id)

    // Add phone number filter if provided
    if (phoneNumber) {
      phoneNumbersQuery = phoneNumbersQuery.eq("number", phoneNumber)
    }

    // Get the phone number IDs for the current user
    const { data: phoneNumbersData, error: phoneNumbersError } = await phoneNumbersQuery

    if (phoneNumbersError) {
      console.error("Error fetching phone numbers:", phoneNumbersError)
      return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 })
    }

    // If no phone numbers found, return zeros
    if (!phoneNumbersData || phoneNumbersData.length === 0) {
      return NextResponse.json({
        totalCalls: 0,
        activeFlows: 0,
        conversionRate: 0,
        callsThisMonth: 0,
        callsLastMonth: 0,
        conversionRateChange: 0,
        activeFlowsChange: 0,
      })
    }

    // Extract phone number IDs
    const phoneNumberIds = phoneNumbersData.map((pn) => pn.id)

    // Get total calls for the user's phone numbers
    const { count: totalCalls, error: totalCallsError } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .in("phone_number_id", phoneNumberIds)

    if (totalCallsError) {
      console.error("Error counting total calls:", totalCallsError)
      return NextResponse.json({ error: "Failed to count calls" }, { status: 500 })
    }

    // Get calls this month
    const { count: callsThisMonth, error: thisMonthError } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .in("phone_number_id", phoneNumberIds)
      .gte("started_at", thisMonthStart.toISOString())

    if (thisMonthError) {
      console.error("Error counting this month calls:", thisMonthError)
      return NextResponse.json({ error: "Failed to count calls" }, { status: 500 })
    }

    // Get calls last month
    const { count: callsLastMonth, error: lastMonthError } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .in("phone_number_id", phoneNumberIds)
      .gte("started_at", lastMonthStart.toISOString())
      .lt("started_at", thisMonthStart.toISOString())

    if (lastMonthError) {
      console.error("Error counting last month calls:", lastMonthError)
      return NextResponse.json({ error: "Failed to count calls" }, { status: 500 })
    }

    // Get active pathways count
    const { count: activeFlows, error: activeFlowsError } = await supabase
      .from("pathways")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (activeFlowsError) {
      console.error("Error counting active flows:", activeFlowsError)
      return NextResponse.json({ error: "Failed to count active flows" }, { status: 500 })
    }

    // Calculate conversion rate and changes
    const conversionRate = totalCalls > 0 ? Math.round((activeFlows / totalCalls) * 100) : 0
    const callsChange = callsLastMonth > 0 ? ((callsThisMonth - callsLastMonth) / callsLastMonth) * 100 : 0

    // For demo purposes, using random values for some metrics
    const activeFlowsChange = Math.floor(Math.random() * 10) - 5
    const conversionRateChange = Math.floor(Math.random() * 10) - 5

    return NextResponse.json({
      totalCalls: totalCalls || 0,
      activeFlows: activeFlows || 0,
      conversionRate,
      callsThisMonth: callsThisMonth || 0,
      callsLastMonth: callsLastMonth || 0,
      conversionRateChange,
      activeFlowsChange,
    })
  } catch (error) {
    console.error("Error in call-summary API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
