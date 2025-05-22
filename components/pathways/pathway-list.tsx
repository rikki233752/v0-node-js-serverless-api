"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ArrowRight, Plus, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import type { Pathway } from "@/lib/db-utils"

export default function PathwayList() {
  const router = useRouter()
  const { user } = useAuth()
  const [pathways, setPathways] = useState<Pathway[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch if user is authenticated
    if (!user) {
      setIsLoading(false)
      return
    }

    // Fetch pathways from the API
    const fetchPathways = async () => {
      try {
        setIsLoading(true)

        // Use the API endpoint that filters by creator_id
        const response = await fetch("/api/pathways")

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const data = await response.json()

        // Check if we have valid data
        if (data && Array.isArray(data)) {
          setPathways(data)
        } else {
          console.warn("Unexpected data format:", data)
          setPathways([])
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching pathways:", err)
        setError("Failed to load pathways. Please try again later.")
        setIsLoading(false)
      }
    }

    fetchPathways()
  }, [user])

  const handleEditPathway = (pathwayId: string) => {
    router.push(`/dashboard/pathway/edit/${pathwayId}`)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">My Pathways</h1>
        <Button className="flex items-center gap-2" onClick={() => router.push("/dashboard/pathway/new")}>
          <Plus size={16} />
          Create New Pathway
        </Button>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading pathways...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : pathways.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pathways Found</h3>
            <p className="text-muted-foreground mb-6">You haven't created any pathways yet.</p>
            <Button onClick={() => router.push("/dashboard/pathway/new")}>Create a Pathway</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pathways.map((pathway) => (
              <Card key={pathway.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{pathway.name}</CardTitle>
                      <CardDescription>{pathway.description || "No description"}</CardDescription>
                    </div>
                    <Badge variant={pathway.bland_id ? "default" : "outline"}>
                      {pathway.bland_id ? "Deployed" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Last updated: {new Date(pathway.updated_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleEditPathway(pathway.id)}
                  >
                    Edit Pathway
                    <ArrowRight size={16} />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
