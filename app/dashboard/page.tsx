"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUserPathways } from "@/services/pathway-service"
import { getUserPhoneNumbers } from "@/services/phone-number-service"
import { Skeleton } from "@/components/ui/skeleton"
import { PlusCircle, Phone, FileLineChartIcon as FlowChart, Clock } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [pathways, setPathways] = useState<any[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [pathwaysData, phoneNumbersData] = await Promise.all([getUserPathways(), getUserPhoneNumbers()])

        setPathways(pathwaysData)
        setPhoneNumbers(phoneNumbersData)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCreateNewPathway = () => {
    router.push("/dashboard/call-flows/new")
  }

  const handleViewPathway = (id: string) => {
    router.push(`/dashboard/call-flows/editor?id=${id}`)
  }

  const handlePurchaseNumber = () => {
    router.push("/dashboard/phone-numbers/purchase")
  }

  const handleViewPhoneNumber = (number: string) => {
    // Remove any non-digit characters for the URL
    const cleanNumber = number.replace(/\D/g, "")
    router.push(`/dashboard/pathway/${cleanNumber}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome to your Bland.ai Flow Builder dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateNewPathway} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New Pathway
          </Button>
          <Button onClick={handlePurchaseNumber} variant="outline" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Purchase Number
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Pathways</CardTitle>
            <CardDescription>Your created call flows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FlowChart className="h-5 w-5 mr-2 text-blue-500" />
              <span className="text-3xl font-bold">{isLoading ? "-" : pathways.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Phone Numbers</CardTitle>
            <CardDescription>Your active phone numbers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Phone className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-3xl font-bold">{isLoading ? "-" : phoneNumbers.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Recent Calls</CardTitle>
            <CardDescription>Calls in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-purple-500" />
              <span className="text-3xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pathways" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pathways">My Pathways</TabsTrigger>
          <TabsTrigger value="numbers">My Phone Numbers</TabsTrigger>
        </TabsList>

        <TabsContent value="pathways" className="space-y-4">
          {error && <div className="p-4 bg-red-50 text-red-800 rounded-md">{error}</div>}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pathways.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <FlowChart className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No pathways yet</h3>
                <p className="text-gray-500 text-center mb-4">
                  Create your first pathway to start building your call flow
                </p>
                <Button onClick={handleCreateNewPathway}>Create Pathway</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pathways.map((pathway) => (
                <Card key={pathway.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle>{pathway.name}</CardTitle>
                    <CardDescription>
                      {pathway.is_published ? "Published" : "Draft"} • Created{" "}
                      {new Date(pathway.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {pathway.description || "No description provided"}
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => handleViewPathway(pathway.id)}>
                      View Pathway
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="numbers" className="space-y-4">
          {error && <div className="p-4 bg-red-50 text-red-800 rounded-md">{error}</div>}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : phoneNumbers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Phone className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No phone numbers yet</h3>
                <p className="text-gray-500 text-center mb-4">Purchase a phone number to connect with your pathways</p>
                <Button onClick={handlePurchaseNumber}>Purchase Number</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phoneNumbers.map((phoneNumber) => (
                <Card key={phoneNumber.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle>{phoneNumber.number}</CardTitle>
                    <CardDescription>
                      {phoneNumber.location} • {phoneNumber.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">
                        {phoneNumber.pathway_id ? "Pathway assigned" : "No pathway assigned"}
                      </span>
                      <span className="text-sm font-medium">${phoneNumber.monthly_fee}/mo</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewPhoneNumber(phoneNumber.number)}
                    >
                      Manage Number
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
