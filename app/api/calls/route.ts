import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getCallsByUserId, getCallsByTeamId, getCallsByPhoneNumber } from "@/lib/data-access/calls"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")
    const phoneNumber = searchParams.get("phoneNumber")

    let callsResult

    if (phoneNumber) {
      callsResult = await getCallsByPhoneNumber(phoneNumber)
    } else if (teamId) {
      callsResult = await getCallsByTeamId(teamId)
    } else {
      callsResult = await getCallsByUserId(user.id)
    }

    if (!callsResult.success) {
      return NextResponse.json({ error: callsResult.error }, { status: 500 })
    }

    return NextResponse.json(callsResult.data)
  } catch (error) {
    console.error("Error fetching calls:", error)
    return NextResponse.json({ error: "Failed to fetch calls" }, { status: 500 })
  }
}
