import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For now, return mock data until we fully implement the database functions
    const mockPathways = [
      {
        id: "1",
        name: "Sales Qualification",
        description: "Pathway for qualifying sales leads",
        teamId: null,
        creatorId: user.id,
        updaterId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Customer Support",
        description: "Pathway for handling customer support calls",
        teamId: "1",
        creatorId: user.id,
        updaterId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    return NextResponse.json(mockPathways)
  } catch (error) {
    console.error("Error fetching pathways:", error)
    return NextResponse.json({ error: "Failed to fetch pathways" }, { status: 500 })
  }
}
