import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get("phoneNumber")
    const dateRange = searchParams.get("dateRange")

    // Get the API key from environment variables
    const apiKey = process.env.BLAND_AI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Call the Bland.ai API to get calls
    const response = await fetch("https://api.bland.ai/v1/calls", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch calls from Bland.ai" }, { status: response.status })
    }

    const data = await response.json()

    // Access the calls array from the response object
    const calls = Array.isArray(data.calls) ? data.calls : []

    // Filter calls if a phone number is provided
    let filteredCalls = calls
    if (phoneNumber) {
      const normalize = (num: string | null | undefined) => {
        if (!num || typeof num !== "string") return ""
        return num.replace(/\D/g, "")
      }

      const normalizedTargetNumber = normalize(phoneNumber)

      filteredCalls = calls.filter((call: any) => {
        if (!call || !call.to) return false
        return normalize(call.to) === normalizedTargetNumber
      })
    }

    // Get calls from this month and last month for comparison
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

    const callsThisMonth = filteredCalls.filter((call: any) => {
      if (!call.start_time) return false
      const callDate = new Date(call.start_time)
      return callDate.getMonth() === thisMonth && callDate.getFullYear() === thisYear
    })

    const callsLastMonth = filteredCalls.filter((call: any) => {
      if (!call.start_time) return false
      const callDate = new Date(call.start_time)
      return callDate.getMonth() === lastMonth && callDate.getFullYear() === lastMonthYear
    })

    // Calculate conversion rates
    const completedCallsThisMonth = callsThisMonth.filter((call: any) => call.status === "completed").length
    const completedCallsLastMonth = callsLastMonth.filter((call: any) => call.status === "completed").length

    const conversionRateThisMonth =
      callsThisMonth.length > 0 ? (completedCallsThisMonth / callsThisMonth.length) * 100 : 0

    const conversionRateLastMonth =
      callsLastMonth.length > 0 ? (completedCallsLastMonth / callsLastMonth.length) * 100 : 0

    // Get unique active pathways
    const activePathways = new Set()
    filteredCalls.forEach((call: any) => {
      if (call.pathway_name) {
        activePathways.add(call.pathway_name)
      }
    })

    // Get unique active pathways from last month
    const lastMonthActivePathways = new Set()
    callsLastMonth.forEach((call: any) => {
      if (call.pathway_name) {
        lastMonthActivePathways.add(call.pathway_name)
      }
    })

    // Calculate changes
    const conversionRateChange =
      conversionRateLastMonth > 0
        ? ((conversionRateThisMonth - conversionRateLastMonth) / conversionRateLastMonth) * 100
        : 0

    const activeFlowsChange =
      lastMonthActivePathways.size > 0
        ? ((activePathways.size - lastMonthActivePathways.size) / lastMonthActivePathways.size) * 100
        : 0

    // Return the summary data
    return NextResponse.json({
      totalCalls: filteredCalls.length,
      activeFlows: activePathways.size,
      conversionRate: conversionRateThisMonth,
      callsThisMonth: callsThisMonth.length,
      callsLastMonth: callsLastMonth.length,
      conversionRateChange,
      activeFlowsChange,
    })
  } catch (error) {
    console.error("Error fetching call summary:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
