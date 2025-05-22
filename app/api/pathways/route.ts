import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { createPathway, getPathwaysByUserId, getPathwaysByTeamId } from "@/lib/data-access/pathways"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")

    let pathwaysResult

    if (teamId) {
      pathwaysResult = await getPathwaysByTeamId(teamId)
    } else {
      pathwaysResult = await getPathwaysByUserId(user.id)
    }

    if (!pathwaysResult.success) {
      return NextResponse.json({ error: pathwaysResult.error }, { status: 500 })
    }

    return NextResponse.json(pathwaysResult.data)
  } catch (error) {
    console.error("Error fetching pathways:", error)
    return NextResponse.json({ error: "Failed to fetch pathways" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (!body.name || !body.data) {
      return NextResponse.json({ error: "Name and data are required" }, { status: 400 })
    }

    const pathwayResult = await createPathway({
      name: body.name,
      description: body.description,
      teamId: body.teamId,
      creatorId: user.id,
      data: body.data,
      blandId: body.blandId,
    })

    if (!pathwayResult.success) {
      return NextResponse.json({ error: pathwayResult.error }, { status: 500 })
    }

    return NextResponse.json(pathwayResult.data, { status: 201 })
  } catch (error) {
    console.error("Error creating pathway:", error)
    return NextResponse.json({ error: "Failed to create pathway" }, { status: 500 })
  }
}
