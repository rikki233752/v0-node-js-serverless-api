"use client"

import { useState } from "react"
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

// Updated phone numbers array with only the requested number
const phoneNumbers = [
  {
    id: "1",
    number: "+1 (978) 783-6427",
    location: "Massachusetts, MA",
    type: "Local",
    status: "Active",
    purchaseDate: "2025-04-10",
    monthlyFee: "$1.00",
    assignedTo: "My Pathway",
  },
]

export default function PhoneNumbersPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredNumbers = phoneNumbers.filter(
    (phone) =>
      phone.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
          <CardDescription>You have {phoneNumbers.length} phone number in your account</CardDescription>
        </CardHeader>
        <CardContent>
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
                        onClick={() => {
                          navigator.clipboard.writeText(phone.number)
                        }}
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
                  <TableCell>{phone.purchaseDate}</TableCell>
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
                        <DropdownMenuItem>Assign to Pathway</DropdownMenuItem>
                        <DropdownMenuItem>View Call History</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Edit Settings</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Release Number</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredNumbers.length} of {phoneNumbers.length} phone number
          </div>
          <Button variant="outline" size="sm">
            Export List
          </Button>
        </CardFooter>
      </Card>

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
    </div>
  )
}
