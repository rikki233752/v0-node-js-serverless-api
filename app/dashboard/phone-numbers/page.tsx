"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Copy, MoreVertical, Phone, Plus, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PhoneNumber {
  id: string
  number: string
  location: string
  type: string
  status: string
  purchaseDate: string
  monthlyFee: string
  assignedTo: string
  pathway_id?: string | null
}

export default function PhoneNumbersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadPhoneNumbers() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/bland-ai/user-phone-numbers")

        if (!response.ok) {
          throw new Error(`Failed to fetch phone numbers: ${response.status}`)
        }

        const data = await response.json()
        setPhoneNumbers(data)
      } catch (error) {
        console.error("Error loading phone numbers:", error)
        toast({
          title: "Error",
          description: "Failed to load your phone numbers. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadPhoneNumbers()
  }, [toast])

  const filteredNumbers = phoneNumbers.filter(
    (phone) =>
      phone.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCopyNumber = (number: string) => {
    navigator.clipboard.writeText(number)
    toast({
      title: "Copied!",
      description: "Phone number copied to clipboard",
    })
  }

  const handleAssignToPathway = (phoneId: string) => {
    router.push(`/dashboard/phone-numbers/assign/${phoneId}`)
  }

  const handleViewCallHistory = (phoneId: string) => {
    router.push(`/dashboard/call-history?phone=${phoneId}`)
  }

  const handleReleaseNumber = async (phoneId: string) => {
    // Implement release number functionality
    toast({
      title: "Coming Soon",
      description: "Number release functionality will be available soon.",
    })
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phone Numbers</h1>
          <p className="text-muted-foreground">Manage your purchased phone numbers and their assignments</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => router.push("/dashboard/phone-numbers/purchase")}>
          <Plus className="h-4 w-4" />
          Purchase New Number
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Your Phone Numbers</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search numbers..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <CardDescription>
            You have {phoneNumbers.length} phone number{phoneNumbers.length !== 1 ? "s" : ""} in your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : phoneNumbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No phone numbers yet</h3>
              <p className="text-muted-foreground mt-1 mb-4">Purchase your first phone number to get started</p>
              <Button onClick={() => router.push("/dashboard/phone-numbers/purchase")}>Purchase a Number</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNumbers.map((phone) => (
                  <TableRow key={phone.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {phone.number}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyNumber(phone.number)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{phone.location}</TableCell>
                    <TableCell>{phone.type}</TableCell>
                    <TableCell>
                      <Badge variant={phone.status === "Active" ? "default" : "secondary"}>{phone.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(phone.purchaseDate).toLocaleDateString()}</TableCell>
                    <TableCell>{phone.monthlyFee}</TableCell>
                    <TableCell>{phone.assignedTo}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleAssignToPathway(phone.id)}>
                            Assign to Pathway
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewCallHistory(phone.id)}>
                            View Call History
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Edit Settings</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleReleaseNumber(phone.id)}>
                            Release Number
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {phoneNumbers.length > 0 && (
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredNumbers.length} of {phoneNumbers.length} phone number
              {phoneNumbers.length !== 1 ? "s" : ""}
            </div>
            <Button variant="outline" size="sm">
              Export List
            </Button>
          </CardFooter>
        )}
      </Card>

      {phoneNumbers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Number Usage</CardTitle>
            <CardDescription>Monthly call volume for your phone numbers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full rounded-md bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Call volume chart will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
