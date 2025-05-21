"use client"

import { useState } from "react"
import { Handle, Position } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { NodeDeleteButton } from "@/components/flowchart-builder/node-delete-button"
import { NodeDuplicateButton } from "@/components/flowchart-builder/node-duplicate-button"
import { Input } from "@/components/ui/input"
import { X, Plus, Play } from "lucide-react"
import { motion } from "framer-motion"

export default function GreetingNode({ data, selected, id }: any) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(data?.text || "Hello! This is an AI assistant calling. How are you today?")
  const [extractVariables, setExtractVariables] = useState<string[]>(data?.extractVariables || [])
  const [newVariable, setNewVariable] = useState("")

  const handleAddVariable = () => {
    if (newVariable.trim() && !extractVariables.includes(newVariable.trim())) {
      setExtractVariables([...extractVariables, newVariable.trim()])
      setNewVariable("")
    }
  }

  const handleRemoveVariable = (variable: string) => {
    setExtractVariables(extractVariables.filter((v) => v !== variable))
  }

  const handleSave = () => {
    data.text = text
    data.extractVariables = extractVariables
    setIsEditing(false)
  }

  return (
    <div className="relative">
      {selected && (
        <>
          <NodeDeleteButton nodeId={id} />
          <NodeDuplicateButton nodeId={id} />
        </>
      )}
      <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
        <Card
          className={`w-64 shadow-sm hover:shadow-md transition-shadow duration-200 ${selected ? "ring-2 ring-primary" : ""}`}
        >
          <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-t-lg">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="bg-white/80 text-green-600 border-green-200">
                <Play size={12} className="mr-1" />
                Start
              </Badge>
              <span className="text-green-700 dark:text-green-100">Greeting</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 bg-white rounded-b-lg">
            {!isEditing ? (
              <>
                <div className="text-sm min-h-[40px] py-1">
                  {data?.text || "Hello! This is an AI assistant calling..."}
                </div>
                {extractVariables.length > 0 && (
                  <div className="mt-2 text-xs bg-blue-50 p-2 rounded-md border border-blue-100">
                    <span className="font-medium">Extracts:</span> {extractVariables.join(", ")}
                  </div>
                )}
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 rounded-md"
                >
                  Edit Greeting
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`text-${id}`}>Greeting Text</Label>
                  <Textarea
                    id={`text-${id}`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Hello! This is an AI assistant calling..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Extract Variables</Label>
                  {extractVariables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="bg-blue-50 border border-blue-100 rounded-md px-2 py-1 text-sm flex-1">
                        {variable}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveVariable(variable)}
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <Input
                      value={newVariable}
                      onChange={(e) => setNewVariable(e.target.value)}
                      placeholder="Add variable (e.g., Zip, Income)"
                      className="flex-1 rounded-md"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddVariable()
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddVariable}
                      className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-md">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} className="rounded-md">
                    Save
                  </Button>
                </div>
              </div>
            )}
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
