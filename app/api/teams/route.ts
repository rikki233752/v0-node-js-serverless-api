import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { createTeam, getTeamsByUserId } from "@/lib/data-access/teams"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamsResult = await getTeamsByUserId(user.id)

    if (!teamsResult.success) {
      return NextResponse.json({ error: teamsResult.error }, { status: 500 })
    }

    return NextResponse.json(teamsResult.data)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 })
    }

    const teamResult = await createTeam({
      name: body.name,
      description: body.description,
      ownerId: user.id,
    })

    if (!teamResult.success) {
      return NextResponse.json({ error: teamResult.error }, { status: 500 })
    }

    return NextResponse.json(teamResult.data, { status: 201 })
  } catch (error) {
    console.error("Error creating team:", error)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
