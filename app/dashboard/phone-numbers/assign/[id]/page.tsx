"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Phone, ArrowLeft } from "lucide-react"
import { getPhoneNumberById, assignPathwayToPhoneNumber } from "@/services/phone-number-service"
import { getUserPathways } from "@/services/pathway-service"

interface Pathway {
  id: string
  name: string
  description: string | null
  is_published: boolean
}

export default function AssignPathwayPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [phoneNumber, setPhoneNumber] = useState<any>(null)
  const [pathways, setPathways] = useState<Pathway[]>([])
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>("none")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)

        // Load phone number details
        const phoneData = await getPhoneNumberById(params.id)
        setPhoneNumber(phoneData)

        if (phoneData.pathway_id) {
          setSelectedPathwayId(phoneData.pathway_id)
        }

        // Load user pathways
        const pathwaysData = await getUserPathways()
        setPathways(pathwaysData)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load data. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [params.id, toast])

  const handleAssignPathway = async () => {
    try {
      setIsSaving(true)

      await assignPathwayToPhoneNumber(params.id, selectedPathwayId || null)

      toast({
        title: "Success",
        description: selectedPathwayId
          ? "Phone number assigned to pathway successfully"
          : "Phone number unassigned successfully",
      })

      router.push("/dashboard/phone-numbers")
    } catch (error) {
      console.error("Error assigning pathway:", error)
      toast({
        title: "Error",
        description: "Failed to assign pathway. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!phoneNumber) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Phone number not found</p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/phone-numbers")}>
              Return to Phone Numbers
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Assign Pathway to Phone Number</CardTitle>
          <CardDescription>Select a pathway to assign to this phone number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{phoneNumber.number}</p>
              <p className="text-sm text-muted-foreground">{phoneNumber.location}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="pathway" className="text-sm font-medium">
              Select Pathway
            </label>
            <Select value={selectedPathwayId} onValueChange={setSelectedPathwayId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a pathway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Unassign)</SelectItem>
                {pathways.map((pathway) => (
                  <SelectItem key={pathway.id} value={pathway.id}>
                    {pathway.name} {!pathway.is_published && "(Draft)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedPathwayId !== "none"
                ? "This phone number will use the selected pathway for incoming calls"
                : "This phone number will not be connected to any pathway"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/dashboard/phone-numbers")}>
            Cancel
          </Button>
          <Button onClick={handleAssignPathway} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Assignment"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
