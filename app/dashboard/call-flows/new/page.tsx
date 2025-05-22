"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Phone, PhoneCall, PhoneForwarded, PhoneOff } from "lucide-react"
import Link from "next/link"

const flowTemplates = [
  {
    id: "lead-qualification",
    name: "Lead Qualification",
    description: "Qualify leads based on budget, timeline, and requirements",
    icon: Phone,
  },
  {
    id: "appointment-scheduling",
    name: "Appointment Scheduling",
    description: "Schedule appointments with qualified leads",
    icon: PhoneCall,
  },
  {
    id: "customer-feedback",
    name: "Customer Feedback",
    description: "Collect feedback from customers after service delivery",
    icon: PhoneForwarded,
  },
  {
    id: "blank",
    name: "Blank Flow",
    description: "Start from scratch with a blank call flow",
    icon: PhoneOff,
  },
]

export default function NewCallFlowPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [flowName, setFlowName] = useState("")
  const [flowDescription, setFlowDescription] = useState("")
  const router = useRouter()

  const handleCreateFlow = () => {
    // In a real app, this would create the flow in the database
    // For now, we'll just redirect to the call flows page
    router.push("/dashboard/call-flows")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/call-flows">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Create New Call Flow</h2>
      </div>

      {!selectedTemplate ? (
        <>
          <p className="text-muted-foreground">Choose a template to get started or create a blank flow</p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {flowTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:border-primary hover:shadow-md`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <template.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="mt-2">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Select Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Flow Details</CardTitle>
            <CardDescription>Provide basic information about your call flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Flow Name</Label>
              <Input
                id="name"
                placeholder="e.g., Lead Qualification Flow"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this call flow does..."
                rows={3}
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
              />
            </div>
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  {(() => {
                    const IconComponent = flowTemplates.find((t) => t.id === selectedTemplate)?.icon
                    return IconComponent ? <IconComponent className="h-5 w-5 text-blue-400" /> : null
                  })()}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    {flowTemplates.find((t) => t.id === selectedTemplate)?.name} Template Selected
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      You can customize this template after creation. The template provides a starting point with
                      predefined nodes and flows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Back to Templates
            </Button>
            <Button onClick={handleCreateFlow} disabled={!flowName.trim()}>
              Create Flow
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
